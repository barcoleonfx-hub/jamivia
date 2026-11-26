// Jamivia server: serves the website, collects waitlist sign-ups and analytics, takes Stripe orders,
// sends the email sequences and runs the admin dashboard at /admin.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { migrate, one, all, run } from "./db.js";
import { queue, cancel, hasPending, processDue, send } from "./mail.js";
import { renderAdmin, renderLogin, subscribersCsv, ordersCsv } from "./admin.js";
import { customerAction, customersCsv, stockAction, dispatchFromBatch, publicBatch, UPLOADS, CODE_RE, COA_TYPES } from "./backoffice.js";

const ROOT = new URL("..", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 3000);
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const ADMIN_HASH = process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : null;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const PRICE = { sub: process.env.STRIPE_PRICE_SUB || "", one: process.env.STRIPE_PRICE_ONE || "" };
const PRICE_GBP = { sub: Number(process.env.PRICE_SUB_GBP || 37.4), one: Number(process.env.PRICE_ONE_GBP || 44) };

if (!process.env.AUTH_SECRET) console.warn("[jamivia] AUTH_SECRET not set: admin sessions reset on every restart.");
if (!ADMIN_EMAIL || !ADMIN_HASH) console.warn("[jamivia] ADMIN_EMAIL / ADMIN_PASSWORD not set: /admin sign-in is disabled.");

/* ---------------- helpers ---------------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain" };
const PUBLIC = [/^\/$/, /^\/(index|privacy)\.html$/, /^\/img\/[\w.-]+$/, /^\/emails\/[\w.-]*$/, /^\/journal\/[\w-]+\.html$/, /^\/robots\.txt$/, /^\/favicon\.ico$/];

const BASE_HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };
function sendRes(res, status, body, type = "text/plain; charset=utf-8", extra = {}) {
  res.writeHead(status, { ...BASE_HEADERS, "Content-Type": type, ...extra });
  res.end(body);
}
const json = (res, status, obj) => sendRes(res, status, JSON.stringify(obj), "application/json");
const redirect = (res, to, extra = {}) => { res.writeHead(303, { ...BASE_HEADERS, Location: to, ...extra }); res.end(); };

function readBody(req, limit = 20_000) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function parseJson(buf) { try { return JSON.parse(buf.toString("utf8") || "{}"); } catch { return null; } }
function parseForm(buf) { return Object.fromEntries(new URLSearchParams(buf.toString("utf8"))); }

const EMAIL_RE = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;
const clean = (s, n = 200) => (typeof s === "string" ? s.replace(/[\u0000-\u001f]/g, "").trim().slice(0, n) : "");
function ip(req) { return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || ""; }

const buckets = new Map();
function limited(req, key, max, windowMs = 60_000) {
  const k = key + ":" + ip(req), now = Date.now();
  const b = buckets.get(k) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++; buckets.set(k, b);
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k); }, 300_000).unref();

/* ---------------- admin session ---------------- */
const sign = (v) => crypto.createHmac("sha256", AUTH_SECRET).update(v).digest("base64url");
function sessionCookie(req) {
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)jv_admin=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = decodeURIComponent(m[1]).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = sign(exp);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
function cookieFlags(req) { return (req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "") + "; HttpOnly; SameSite=Lax; Path=/"; }
function sameOrigin(req) {
  const o = req.headers.origin;
  if (!o) return true; // older browsers and form posts without Origin still rely on SameSite=Lax
  try { return new URL(o).host === req.headers.host; } catch { return false; }
}

/* ---------------- Stripe ---------------- */
async function stripe(path, params) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST", headers: { Authorization: "Bearer " + STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "Stripe error " + r.status);
  return data;
}
function verifyStripe(raw, header) {
  if (!STRIPE_WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(`${t}.${raw}`).digest("hex");
  return header.split(",").some((p) => {
    const [k, v] = p.split("=");
    return k === "v1" && v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected));
  });
}

/* ---------------- routes ---------------- */
async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  const method = req.method;

  if (path === "/healthz") return sendRes(res, 200, "ok");

  /* ----- public API ----- */
  if (path === "/api/waitlist" && method === "POST") {
    if (limited(req, "wl", 10)) return json(res, 429, { error: "Too many attempts. Try again in a minute." });
    const b = parseJson(await readBody(req));
    const email = clean(b?.email, 254).toLowerCase(), firstName = clean(b?.firstName, 60), source = clean(b?.source, 60) || "website";
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid email address." });
    if (b?.consent !== true) return json(res, 400, { error: "Consent is required to join the list." });
    const existing = await one("SELECT * FROM subscribers WHERE email=?", [email]);
    const now = Date.now();
    if (!existing) {
      await run("INSERT INTO subscribers (email, first_name, source, token, consent_at, created_at) VALUES (?,?,?,?,?,?)",
        [email, firstName || null, source, crypto.randomBytes(18).toString("base64url"), now, now]);
      await queue(email, "waitlist", now, { firstName });
      processDue().catch(() => {});
    } else if (existing.status !== "subscribed") {
      await run("UPDATE subscribers SET status='subscribed', unsubscribed_at=NULL, consent_at=?, first_name=COALESCE(?, first_name) WHERE id=?",
        [now, firstName || null, existing.id]);
    }
    await run("INSERT INTO events (ts, type, sid, path) VALUES (?,?,?,?)", [now, "signup", clean(b?.sid, 64), clean(b?.path, 200)]);
    return json(res, 200, { ok: true });
  }

  if (path === "/api/trade" && method === "POST") {
    if (limited(req, "trade", 5)) return json(res, 429, { error: "Too many attempts. Try again in a minute." });
    const b = parseJson(await readBody(req));
    const email = clean(b?.email, 254).toLowerCase();
    if (!EMAIL_RE.test(email)) return json(res, 400, { error: "Enter a valid work email address." });
    await run("INSERT INTO trade_leads (email, created_at) VALUES (?,?)", [email, Date.now()]);
    return json(res, 200, { ok: true });
  }

  if (path === "/api/event" && method === "POST") {
    if (limited(req, "ev", 120)) return sendRes(res, 204, "");
    const b = parseJson(await readBody(req, 4000));
    const type = clean(b?.type, 30);
    if (!["view", "add_to_cart", "begin_checkout"].includes(type)) return sendRes(res, 204, "");
    const ua = req.headers["user-agent"] || "";
    const device = /mobile|iphone|android/i.test(ua) ? "mobile" : /ipad|tablet/i.test(ua) ? "tablet" : "desktop";
    let ref = clean(b?.referrer, 300);
    try { ref = ref ? new URL(ref).hostname.replace(/^www\./, "") : ""; } catch { ref = ""; }
    if (ref && req.headers.host && ref === req.headers.host.replace(/^www\./, "").split(":")[0]) ref = "";
    const value = Number.isFinite(Number(b?.value)) ? Number(b.value) : null;
    await run("INSERT INTO events (ts, type, sid, path, referrer, utm_source, utm_medium, utm_campaign, device, value) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [Date.now(), type, clean(b?.sid, 64), clean(b?.path, 200), ref || null, clean(b?.utm_source, 80) || null,
       clean(b?.utm_medium, 80) || null, clean(b?.utm_campaign, 80) || null, device, value]);
    // A known subscriber who adds to the bag and doesn't buy gets the abandoned-basket series.
    const email = clean(b?.email, 254).toLowerCase();
    if (type === "add_to_cart" && EMAIL_RE.test(email)) {
      const sub = await one("SELECT * FROM subscribers WHERE email=? AND status='subscribed'", [email]);
      if (sub && !(await hasPending(email, "basket"))) {
        await run("UPDATE subscribers SET last_cart_at=? WHERE id=?", [Date.now(), sub.id]);
        await queue(email, "basket", Date.now(), { itemPrice: value ? "£" + value.toFixed(2) : "" });
      }
    }
    return sendRes(res, 204, "");
  }

  if (path === "/api/checkout" && method === "POST") {
    if (limited(req, "co", 20)) return json(res, 429, { error: "Too many attempts. Try again in a minute." });
    const b = parseJson(await readBody(req));
    const plan = b?.plan === "one" ? "one" : "sub";
    const qty = Math.min(6, Math.max(1, parseInt(b?.qty, 10) || 1));
    if (!STRIPE_KEY || !PRICE[plan]) return json(res, 503, { preview: true, error: "Checkout opens at launch." });
    const origin = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, "");
    const email = clean(b?.email, 254).toLowerCase();
    const params = {
      mode: plan === "sub" ? "subscription" : "payment",
      "line_items[0][price]": PRICE[plan], "line_items[0][quantity]": String(qty),
      success_url: origin + "/?order=success", cancel_url: origin + "/#shop",
      "shipping_address_collection[allowed_countries][0]": "GB",
      "metadata[plan]": plan, "metadata[qty]": String(qty),
      ...(plan === "sub" ? { "subscription_data[metadata][plan]": "sub", "subscription_data[metadata][qty]": String(qty) } : { customer_creation: "always" }),
      allow_promotion_codes: "true", billing_address_collection: "auto",
    };
    if (EMAIL_RE.test(email)) params.customer_email = email;
    try {
      const s = await stripe("checkout/sessions", params);
      return json(res, 200, { url: s.url });
    } catch (e) {
      console.error("[checkout]", e.message);
      return json(res, 502, { error: "Checkout is unavailable right now. Please try again shortly." });
    }
  }

  if (path === "/api/stripe/webhook" && method === "POST") {
    const raw = (await readBody(req, 500_000)).toString("utf8");
    if (!verifyStripe(raw, req.headers["stripe-signature"])) return sendRes(res, 400, "bad signature");
    const evt = JSON.parse(raw);
    const idOf = (v) => (v && typeof v === "object" ? v.id : v) || null;
    if (evt.type === "checkout.session.completed" || evt.type === "checkout.session.async_payment_succeeded") {
      const s = evt.data.object;
      if (s.payment_status === "unpaid") return json(res, 200, { received: true }); // delayed payment methods: wait for async_payment_succeeded
      const email = (s.customer_details?.email || s.customer_email || "").toLowerCase();
      const ship = s.collected_information?.shipping_details || s.shipping_details || null;
      const plan = s.metadata?.plan || (s.mode === "subscription" ? "sub" : "one");
      const r = await run(
        "INSERT OR IGNORE INTO orders (stripe_session, email, name, plan, qty, amount_pence, currency, address, created_at, stripe_customer, stripe_subscription) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [s.id, email, ship?.name || s.customer_details?.name || "", plan, Number(s.metadata?.qty || 1), s.amount_total || 0,
         (s.currency || "gbp").toUpperCase(), ship ? JSON.stringify(ship.address) : null, Date.now(), idOf(s.customer), idOf(s.subscription)]);
      if (r.rowsAffected && email) {
        await cancel(email, "basket");
        await queue(email, "welcome", Date.now(), { plan, firstName: (ship?.name || s.customer_details?.name || "").split(" ")[0] });
      }
    }
    // Each monthly renewal becomes a new order to dispatch, shipped to the address from the first order.
    if (evt.type === "invoice.paid" || evt.type === "invoice.payment_succeeded") {
      const inv = evt.data.object;
      const subId = idOf(inv.subscription) || idOf(inv.parent?.subscription_details?.subscription);
      if (inv.billing_reason === "subscription_cycle" && subId) {
        const first = await one("SELECT * FROM orders WHERE stripe_subscription=? ORDER BY created_at ASC LIMIT 1", [subId]);
        const last = await one("SELECT * FROM orders WHERE stripe_subscription=? ORDER BY created_at DESC LIMIT 1", [subId]);
        const ship = inv.customer_shipping;
        const qty = (inv.lines?.data || []).reduce((a, l) => a + Number(l.quantity || 0), 0) || Number(first?.qty || 1);
        await run(
          "INSERT OR IGNORE INTO orders (stripe_session, email, name, plan, qty, amount_pence, currency, address, created_at, stripe_customer, stripe_subscription) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [inv.id, (inv.customer_email || last?.email || "").toLowerCase(), ship?.name || last?.name || inv.customer_name || "", "sub", qty, inv.amount_paid || 0,
           (inv.currency || "gbp").toUpperCase(), ship?.address ? JSON.stringify(ship.address) : last?.address || null, Date.now(), idOf(inv.customer), subId]);
      }
    }
    if (evt.type === "customer.subscription.deleted") {
      const sub = evt.data.object;
      await run("UPDATE orders SET sub_ended_at=? WHERE stripe_subscription=? AND sub_ended_at IS NULL", [Date.now(), sub.id]);
    }
    return json(res, 200, { received: true });
  }

  // Batch lookup on the website: status, dates and the certificate link for released batches.
  if (path === "/api/batch" && method === "GET") {
    if (limited(req, "batch", 30)) return json(res, 429, { error: "Too many lookups. Try again in a minute." });
    const code = clean(url.searchParams.get("code") || "", 40);
    if (!CODE_RE.test(code)) return json(res, 400, { error: "Enter the batch code printed on the base of your tub." });
    return json(res, 200, await publicBatch(code));
  }
  const coaM = path.match(/^\/coa\/([A-Za-z0-9._%/-]{2,120})$/);
  if (coaM && (method === "GET" || method === "HEAD")) {
    let code; try { code = decodeURIComponent(coaM[1]); } catch { return sendRes(res, 404, "Not found"); }
    const b = await one("SELECT * FROM batches WHERE lower(code)=lower(?) AND status='released' AND coa_file IS NOT NULL", [code]);
    if (!b) return sendRes(res, 404, "Not found");
    return sendCoa(res, method, b, false);
  }

  /* ----- unsubscribe ----- */
  if (path === "/unsubscribe") {
    const t = clean(url.searchParams.get("t") || "", 64);
    if (method === "POST") {
      const sub = t && await one("SELECT * FROM subscribers WHERE token=?", [t]);
      if (sub) {
        await run("UPDATE subscribers SET status='unsubscribed', unsubscribed_at=? WHERE id=?", [Date.now(), sub.id]);
        await run("UPDATE email_jobs SET cancelled_at=? WHERE email=? AND sent_at IS NULL AND cancelled_at IS NULL", [Date.now(), sub.email]);
      }
      return sendRes(res, 200, simplePage("You've been unsubscribed", "You won't receive any more marketing emails from Jamivia. If this was a mistake, you can join again on our website at any time."), TYPES[".html"]);
    }
    return sendRes(res, 200, simplePage("Unsubscribe from Jamivia emails",
      `<form method="post" action="/unsubscribe?t=${encodeURIComponent(t)}"><button>Unsubscribe</button></form>`), TYPES[".html"]);
  }

  /* ----- admin ----- */
  if (path === "/admin/login" && method === "POST") {
    if (limited(req, "login", 8, 15 * 60_000)) return sendRes(res, 429, renderLogin("Too many attempts. Wait 15 minutes and try again."), TYPES[".html"]);
    const f = parseForm(await readBody(req));
    const ok = ADMIN_HASH && clean(f.email, 254).toLowerCase() === ADMIN_EMAIL && (await bcrypt.compare(String(f.password || ""), ADMIN_HASH));
    if (!ok) return sendRes(res, 401, renderLogin("That email and password don't match. Check them and try again."), TYPES[".html"]);
    const exp = String(Date.now() + 7 * 24 * 3600e3);
    return redirect(res, "/admin", { "Set-Cookie": `jv_admin=${exp}.${sign(exp)}; Max-Age=604800${cookieFlags(req)}` });
  }
  if (path === "/admin/logout" && method === "POST") return redirect(res, "/admin", { "Set-Cookie": `jv_admin=; Max-Age=0${cookieFlags(req)}` });
  if (path === "/admin" || path.startsWith("/admin/")) {
    const adminHeaders = { "Cache-Control": "no-store", "X-Frame-Options": "DENY" };
    if (!sessionCookie(req)) {
      if (method !== "GET") return sendRes(res, 401, "Sign in first");
      return sendRes(res, 200, renderLogin(ADMIN_HASH ? "" : "Sign-in isn't set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD in the hosting settings."), TYPES[".html"], adminHeaders);
    }
    if (method === "POST" && !sameOrigin(req)) return sendRes(res, 403, "Forbidden");
    if (path === "/admin/subscribers.csv") return sendRes(res, 200, await subscribersCsv(), "text/csv; charset=utf-8", { ...adminHeaders, "Content-Disposition": 'attachment; filename="jamivia-subscribers.csv"' });
    if (path === "/admin/orders.csv") return sendRes(res, 200, await ordersCsv(), "text/csv; charset=utf-8", { ...adminHeaders, "Content-Disposition": 'attachment; filename="jamivia-orders.csv"' });
    if (path === "/admin/customers.csv") return sendRes(res, 200, await customersCsv(), "text/csv; charset=utf-8", { ...adminHeaders, "Content-Disposition": 'attachment; filename="jamivia-customers.csv"' });
    const m = path.match(/^\/admin\/orders\/(\d+)\/dispatch$/);
    if (m && method === "POST") {
      const f = parseForm(await readBody(req));
      const order = await one("SELECT * FROM orders WHERE id=? AND status='paid'", [Number(m[1])]);
      if (!order) return redirect(res, "/admin?tab=orders");
      const now = Date.now();
      const r = await dispatchFromBatch(order.id, Number(f.batch_id) || 0, Number(order.qty || 1), now);
      if (!r.ok) return redirect(res, "/admin?tab=orders&err=batch");
      await run("UPDATE orders SET status='dispatched', tracking=?, dispatched_at=? WHERE id=?", [clean(f.tracking, 60) || null, now, order.id]);
      return redirect(res, "/admin?tab=orders");
    }
    const rf = path.match(/^\/admin\/orders\/(\d+)\/refunded$/);
    if (rf && method === "POST") {
      await run("UPDATE orders SET status='refunded', refunded_at=? WHERE id=? AND status!='refunded'", [Date.now(), Number(rf[1])]);
      return redirect(res, "/admin?tab=orders");
    }
    const cm = path.match(/^\/admin\/customers\/(note|note-delete|tags|unsubscribe|resubscribe|erase)$/);
    if (cm && method === "POST") return redirect(res, await customerAction(cm[1], parseForm(await readBody(req))));
    const sm = path.match(/^\/admin\/stock\/(receive|coa|coa-delete|status|adjust|threshold)$/);
    if (sm && method === "POST") {
      let f;
      if (/^multipart\/form-data/i.test(req.headers["content-type"] || "")) {
        const buf = await readBody(req, 11 * 1024 * 1024);
        try { f = Object.fromEntries(await new Request("http://x", { method: "POST", headers: { "content-type": req.headers["content-type"] }, body: buf }).formData()); }
        catch { return redirect(res, "/admin?tab=stock&err=file"); }
        for (const k of Object.keys(f)) if (typeof f[k] === "string") f[k] = clean(f[k], 200);
      } else f = parseForm(await readBody(req));
      return redirect(res, await stockAction(sm[1], f));
    }
    const am = path.match(/^\/admin\/coa\/(\d+)$/);
    if (am && method === "GET") {
      const b = await one("SELECT * FROM batches WHERE id=? AND coa_file IS NOT NULL", [Number(am[1])]);
      if (!b) return sendRes(res, 404, "Not found");
      return sendCoa(res, method, b, true);
    }
    if (path === "/admin/stripe-check") {
      const rows = [];
      const kind = /^sk_test_/.test(STRIPE_KEY) ? "Secret key, TEST mode" : /^sk_live_/.test(STRIPE_KEY) ? "Secret key, LIVE mode"
        : /^rk_/.test(STRIPE_KEY) ? "Restricted key (use the Secret key instead)" : /^pk_/.test(STRIPE_KEY) ? "Publishable key: wrong key, use the Secret key (sk_…)"
        : STRIPE_KEY ? "Not a Stripe secret key" : "Missing";
      rows.push(["STRIPE_SECRET_KEY", kind, /^sk_(test|live)_/.test(STRIPE_KEY)]);
      let account = null;
      if (STRIPE_KEY) {
        const r = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: "Bearer " + STRIPE_KEY } }).then((r) => r.json()).catch((e) => ({ error: { message: e.message } }));
        if (r.error) rows.push(["Connection to Stripe", "Refused: " + r.error.message, false]);
        else { account = r; rows.push(["Connection to Stripe", `Connected to ${r.settings?.dashboard?.display_name || r.business_profile?.name || "account"} (${r.country || ""})`, true]); }
      }
      for (const [k, v, want] of [["STRIPE_PRICE_SUB", PRICE.sub, "recurring"], ["STRIPE_PRICE_ONE", PRICE.one, "one_time"]]) {
        if (!v) { rows.push([k, "Missing", false]); continue; }
        if (/^prod_/.test(v)) { rows.push([k, "This is a product ID (prod_…). Open the product and copy the price ID (price_…) instead.", false]); continue; }
        if (!/^price_/.test(v)) { rows.push([k, "Not a price ID. It should start price_", false]); continue; }
        if (!account) { rows.push([k, "Can't check until the key works", false]); continue; }
        const p = await fetch("https://api.stripe.com/v1/prices/" + encodeURIComponent(v), { headers: { Authorization: "Bearer " + STRIPE_KEY } }).then((r) => r.json()).catch((e) => ({ error: { message: e.message } }));
        if (p.error) rows.push([k, "Stripe says: " + p.error.message + (/No such price/.test(p.error.message) ? " (usually a test price with a live key or the other way round)" : ""), false]);
        else {
          const ok = p.type === want && p.active && p.currency === "gbp";
          rows.push([k, `£${(p.unit_amount / 100).toFixed(2)} ${p.type === "recurring" ? "every " + p.recurring.interval : "one-off"}${p.active ? "" : ", ARCHIVED"}${p.type !== want ? (want === "recurring" ? ": should be a monthly recurring price" : ": should be a one-off price") : ""}`, ok]);
        }
      }
      rows.push(["STRIPE_WEBHOOK_SECRET", /^whsec_/.test(STRIPE_WEBHOOK_SECRET) ? "Set" : STRIPE_WEBHOOK_SECRET ? "Doesn't look right: it should start whsec_" : "Missing: orders won't reach the admin after payment", /^whsec_/.test(STRIPE_WEBHOOK_SECRET)]);
      const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      return sendRes(res, 200, simplePage("Stripe check", `<table style="text-align:left;font-family:system-ui,sans-serif;font-size:.9rem;border-collapse:collapse;margin:1rem auto">${rows.map(([a, b, ok]) =>
        `<tr><td style="padding:.5rem .8rem;color:${ok ? "#9fd4ad" : "#f0a59a"}">${ok ? "✓" : "✗"}</td><td style="padding:.5rem .8rem">${esc(a)}</td><td style="padding:.5rem .8rem;color:#d9dccf">${esc(b)}</td></tr>`).join("")}</table>`), TYPES[".html"], adminHeaders);
    }
    if (path === "/admin/test-email" && method === "POST") {
      const f = parseForm(await readBody(req));
      const to = clean(f.email, 254).toLowerCase(), tpl = clean(f.template, 40);
      if (EMAIL_RE.test(to) && /^[a-z0-9-]+$/.test(tpl)) await send(to, tpl, { firstName: "there" }).catch((e) => console.error(e));
      return redirect(res, "/admin?tab=emails&sent=1");
    }
    if (path === "/admin") {
      const html = await renderAdmin(url.searchParams, { stripe: !!STRIPE_KEY, smtp: !!process.env.SMTP_HOST, prices: PRICE_GBP });
      return sendRes(res, 200, html, TYPES[".html"], adminHeaders);
    }
    return sendRes(res, 404, "Not found");
  }

  /* ----- static site ----- */
  if (method === "GET" || method === "HEAD") {
    let p = path === "/" ? "/index.html" : decodeURIComponent(path);
    if (p === "/emails/") p = "/emails/index.html";
    if (!PUBLIC.some((re) => re.test(path)) && p !== "/emails/index.html") return sendRes(res, 404, "Not found");
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) return sendRes(res, 404, "Not found");
    try {
      const st = await stat(file);
      if (!st.isFile()) return sendRes(res, 404, "Not found");
      const type = TYPES[extname(file).toLowerCase()] || "application/octet-stream";
      const cache = p.startsWith("/img/") ? "public, max-age=604800" : "public, max-age=300";
      return sendRes(res, 200, method === "HEAD" ? "" : await readFile(file), type, { "Cache-Control": cache });
    } catch {
      if (path === "/robots.txt") return sendRes(res, 200, "User-agent: *\nDisallow: /admin\n");
      return sendRes(res, 404, "Not found");
    }
  }
  return sendRes(res, 405, "Method not allowed");
}

async function sendCoa(res, method, b, isAdmin) {
  const type = COA_TYPES[extname(b.coa_file)] || "application/octet-stream";
  try {
    const data = await readFile(join(UPLOADS, b.coa_file));
    const name = `Jamivia-${String(b.code).replace(/[^\w.-]/g, "-")}-certificate${extname(b.coa_file)}`;
    return sendRes(res, 200, method === "HEAD" ? "" : data, type, {
      "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": isAdmin ? "no-store" : "public, max-age=300" });
  } catch { return sendRes(res, 404, "Not found"); }
}

function simplePage(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1E392C;color:#EEEBE1;font-family:Georgia,serif;padding:24px}
main{max-width:30rem;text-align:center}h1{font-weight:400;font-size:2.2rem}p{font-family:system-ui,sans-serif;color:#B7BFB4;line-height:1.6}
button{font:inherit;font-family:system-ui,sans-serif;letter-spacing:.15em;text-transform:uppercase;font-size:.8rem;background:#CDB07A;color:#13201A;border:0;border-radius:999px;padding:1rem 1.8rem;cursor:pointer}
a{color:#CDB07A}</style></head><body><main><p style="letter-spacing:.4em">JAMIVIA</p><h1>${title}</h1>${body.startsWith("<") ? body : `<p>${body}</p>`}<p><a href="/">Back to the website</a></p></main></body></html>`;
}

/* ---------------- start ---------------- */
await migrate();
const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error("[error]", req.method, req.url, e);
    if (!res.headersSent) json(res, e.message === "too large" ? 413 : 500, { error: "Something went wrong. Please try again." });
  });
});
server.listen(PORT, () => console.log(`[jamivia] listening on :${PORT}`));
setInterval(() => processDue().catch((e) => console.error("[mail]", e)), 5 * 60_000).unref();
setTimeout(() => processDue().catch(() => {}), 5000).unref();
