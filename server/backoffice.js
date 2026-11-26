// Back office: customers (CRM) and stock (batches, deliveries, certificates, movements).
// Pages are rendered inside the admin shell from admin.js; actions are called from index.js.
import { mkdirSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import crypto from "node:crypto";
import { one, all, run, setting, setSetting } from "./db.js";

const ROOT = new URL("..", import.meta.url).pathname;
const dbFile = (process.env.DATABASE_URL || "file:./data/jamivia.db").replace(/^file:/, "");
export const UPLOADS = process.env.UPLOADS_DIR || join(dirname(dbFile.startsWith("/") ? dbFile : join(ROOT, dbFile)), "uploads");
mkdirSync(UPLOADS, { recursive: true });

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (v) => Number(v || 0).toLocaleString("en-GB");
const gbp = (pence) => "£" + (Number(pence || 0) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (ms) => ms ? new Date(Number(ms)).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDay = (ms) => ms ? new Date(Number(ms)).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtISO = (d) => d ? new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const DAY = 86400e3;
export const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{1,39}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const cleanTags = (s) => [...new Set(String(s || "").split(",").map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").slice(0, 24)).filter(Boolean))].slice(0, 12).join(", ");

export const BACKOFFICE_CSS = `
main{grid-template-columns:minmax(0,1fr)}.scroll{position:relative}.profile>*,.stack>*,.grid2>*,.grid3>*{min-width:0}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.seg{display:flex;flex-wrap:wrap;gap:.4rem}.seg a{text-decoration:none;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;padding:.42rem .8rem;border-radius:999px;border:1px solid var(--line);color:var(--muted)}
.seg a.on{background:var(--forest);border-color:var(--forest);color:#EEEBE1}.seg a b{font-weight:400;opacity:.7;margin-left:.3rem}
.tag{display:inline-block;font-size:.66rem;letter-spacing:.08em;border-radius:999px;padding:.15rem .55rem;margin:.1rem .2rem .1rem 0;background:rgba(205,176,122,.25);color:var(--ink)}
.pill.customer{background:#CFE3D4;color:#1D4A2E}.pill.subscription{background:#1E392C;color:#EEEBE1}.pill.trade{background:#E9D9B2;color:#4A3B17}.pill.waitlist{background:var(--line)}
.pill.testing{background:#E9D9B2;color:#4A3B17}.pill.released{background:#CFE3D4;color:#1D4A2E}.pill.recalled,.pill.low{background:#EED3CE;color:#6A2A22}.pill.expired{background:#d9d4cc;color:#4a453c}
.profile{display:grid;grid-template-columns:1.25fr 1fr;gap:12px}
.dl{display:grid;grid-template-columns:auto 1fr;gap:.45rem 1.2rem;margin:0}.dl dt{color:var(--muted);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}.dl dd{margin:0}
.notes{display:grid;gap:.7rem;margin:0;padding:0;list-style:none}.notes li{border-left:2px solid var(--gold-soft);padding:.2rem 0 .2rem .8rem}.notes time{display:block;font-size:.74rem;color:var(--muted)}
textarea{font:inherit;width:100%;min-height:80px;padding:.7rem .9rem;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);resize:vertical}
.stack{display:grid;gap:.6rem}.row{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end}.row label{display:grid;gap:.25rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.row label input,.row label select{text-transform:none;letter-spacing:0}
.danger{border-color:rgba(164,69,58,.35)}.btn.red{background:#A4453A}
.timeline{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}.timeline li{display:grid;grid-template-columns:8.5rem 1fr auto;gap:.8rem;font-size:.88rem;border-bottom:1px solid var(--line);padding-bottom:.5rem}
.flash{background:var(--forest);color:#EEEBE1;border-radius:14px;padding:.8rem 1.1rem}
.flash.err{background:#A4453A}
.meter{height:8px;border-radius:6px;background:var(--line);overflow:hidden;min-width:80px}.meter i{display:block;height:100%;background:var(--forest)}
@media (max-width:1000px){.profile{grid-template-columns:1fr}}
`;

/* ================================================================ CUSTOMERS */
const PEOPLE = `
WITH people AS (
  SELECT email FROM subscribers
  UNION SELECT email FROM orders WHERE email IS NOT NULL AND email != '' AND email != 'deleted'
  UNION SELECT email FROM trade_leads
  UNION SELECT email FROM customer_meta
  UNION SELECT email FROM customer_notes
)
SELECT p.email,
  s.first_name, s.status AS sub_status, s.created_at AS joined, s.source,
  (SELECT COUNT(*) FROM orders o WHERE o.email=p.email AND o.status!='refunded') AS orders,
  (SELECT COALESCE(SUM(amount_pence),0) FROM orders o WHERE o.email=p.email AND o.status!='refunded') AS spent,
  (SELECT MAX(created_at) FROM orders o WHERE o.email=p.email) AS last_order,
  (SELECT MIN(created_at) FROM orders o WHERE o.email=p.email) AS first_order,
  (SELECT name FROM orders o WHERE o.email=p.email AND name != '' ORDER BY created_at DESC LIMIT 1) AS order_name,
  EXISTS(SELECT 1 FROM orders o WHERE o.email=p.email AND o.plan='sub' AND o.status!='refunded' AND o.sub_ended_at IS NULL) AS is_sub,
  EXISTS(SELECT 1 FROM trade_leads t WHERE t.email=p.email) AS is_trade,
  (SELECT MIN(created_at) FROM trade_leads t WHERE t.email=p.email) AS trade_at,
  m.tags
FROM people p
LEFT JOIN subscribers s ON s.email=p.email
LEFT JOIN customer_meta m ON m.email=p.email`;

function badges(c) {
  const b = [];
  if (Number(c.is_sub)) b.push(`<span class="pill subscription">Subscriber</span>`);
  else if (Number(c.orders)) b.push(`<span class="pill customer">Customer</span>`);
  if (c.sub_status === "subscribed" && !Number(c.orders)) b.push(`<span class="pill waitlist">Waitlist</span>`);
  if (c.sub_status === "unsubscribed") b.push(`<span class="pill unsubscribed">Unsubscribed</span>`);
  if (Number(c.is_trade)) b.push(`<span class="pill trade">Trade</span>`);
  return b.join(" ");
}
const tagList = (t) => (t ? String(t).split(",").map((x) => x.trim()).filter(Boolean).map((x) => `<span class="tag">${esc(x)}</span>`).join("") : "");
const displayName = (c) => c.order_name || c.first_name || "";
const custLink = (email) => `/admin?tab=customer&email=${encodeURIComponent(email)}`;

const SEGMENTS = [
  ["all", "Everyone", "1=1"],
  ["customers", "Customers", "orders > 0"],
  ["subscribers", "Subscribers", "is_sub"],
  ["waitlist", "Waitlist only", "sub_status = 'subscribed' AND orders = 0"],
  ["repeat", "Repeat buyers", "orders >= 2"],
  ["trade", "Trade", "is_trade"],
  ["unsubscribed", "Unsubscribed", "sub_status = 'unsubscribed'"],
];

export async function customersPage(params) {
  const seg = SEGMENTS.find((s) => s[0] === params.get("seg")) || SEGMENTS[0];
  const q = (params.get("q") || "").trim().slice(0, 100).toLowerCase();
  const tag = (params.get("tag") || "").trim().slice(0, 24).toLowerCase();
  const where = [seg[2]], args = [];
  if (q) { where.push("(lower(email) LIKE ? OR lower(COALESCE(order_name, first_name, '')) LIKE ? OR lower(COALESCE(tags,'')) LIKE ?)"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (tag) { where.push("(',' || replace(lower(COALESCE(tags,'')), ' ', '') || ',') LIKE ?"); args.push(`%,${tag.replace(/ /g, "")},%`); }
  const rows = await all(`SELECT * FROM (${PEOPLE}) WHERE ${where.join(" AND ")} ORDER BY COALESCE(last_order, joined, trade_at) DESC LIMIT 500`, args);
  const counts = await one(`SELECT COUNT(*) AS everyone, SUM(orders>0) AS customers, SUM(is_sub) AS subscribers, SUM(sub_status='subscribed' AND orders=0) AS waitlist,
    SUM(orders>=2) AS repeat_, SUM(is_trade) AS trade, SUM(sub_status='unsubscribed') AS unsubscribed, COALESCE(SUM(spent),0) AS revenue FROM (${PEOPLE})`);
  const custN = Number(counts.customers || 0);
  const ltv = custN ? Number(counts.revenue) / custN : 0;
  const repeatRate = custN ? ((Number(counts.repeat_ || 0) / custN) * 100).toFixed(1) + "%" : "—";
  const segCount = { all: counts.everyone, customers: counts.customers, subscribers: counts.subscribers, waitlist: counts.waitlist, repeat: counts.repeat_, trade: counts.trade, unsubscribed: counts.unsubscribed };
  const allTags = [...new Set((await all("SELECT tags FROM customer_meta WHERE tags IS NOT NULL AND tags != ''")).flatMap((r) => String(r.tags).split(",").map((t) => t.trim())).filter(Boolean))].sort();
  const qs = (segKey) => { const u = new URLSearchParams({ tab: "customers" }); if (segKey !== "all") u.set("seg", segKey); if (q) u.set("q", q); if (tag) u.set("tag", tag); return "/admin?" + u; };

  return `<div class="head"><div><h1>Customers</h1><p class="note" style="margin-top:.4rem">Everyone who has joined the waitlist, ordered, subscribed or asked about trade, in one place.</p></div>
<div class="tools"><a class="btn line" href="/admin/customers.csv">Export CSV</a></div></div>
${params.get("erased") ? `<p class="flash" role="status">Personal data deleted. Their orders are kept, anonymised, for your accounts.</p>` : ""}
<section class="kpis">
  <div class="card kpi dark"><div class="l">People</div><div class="v">${n(counts.everyone)}</div><span class="d">Across waitlist, orders and trade</span></div>
  <div class="card kpi"><div class="l">Paying customers</div><div class="v">${n(custN)}</div><span class="d">${n(counts.subscribers)} on subscription</span></div>
  <div class="card kpi"><div class="l">Average spend</div><div class="v">${gbp(ltv)}</div><span class="d">Per paying customer, all time</span></div>
  <div class="card kpi"><div class="l">Repeat buyers</div><div class="v">${repeatRate}</div><span class="d">${n(counts.repeat_)} customers with 2+ orders</span></div>
</section>
<section class="card">
  <div class="tools" style="justify-content:space-between">
    <nav class="seg" aria-label="Segments">${SEGMENTS.map(([k, l]) => `<a href="${esc(qs(k))}" class="${k === seg[0] ? "on" : ""}">${l}<b>${n(segCount[k])}</b></a>`).join("")}</nav>
    <form class="tools" style="margin:0" method="get" action="/admin"><input type="hidden" name="tab" value="customers">${seg[0] !== "all" ? `<input type="hidden" name="seg" value="${esc(seg[0])}">` : ""}
      <label class="sr" for="cq">Search customers</label><input id="cq" name="q" value="${esc(q)}" placeholder="Name, email or tag">
      ${allTags.length ? `<label class="sr" for="ct">Tag</label><select id="ct" name="tag"><option value="">All tags</option>${allTags.map((t) => `<option ${t === tag ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
      <button class="btn line">Filter</button></form>
  </div>
  ${rows.length ? `<div class="scroll"><table><tr><th>Customer</th><th>Status</th><th>Tags</th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th><th>First seen</th></tr>
  ${rows.map((c) => `<tr><td><a href="${custLink(c.email)}"><b style="font-weight:400">${esc(displayName(c) || c.email)}</b></a>${displayName(c) ? `<br><span class="note">${esc(c.email)}</span>` : ""}</td>
    <td>${badges(c)}</td><td>${tagList(c.tags)}</td><td class="num">${n(c.orders)}</td><td class="num">${gbp(c.spent)}</td><td>${fmtDay(c.last_order)}</td><td>${fmtDay(Math.min(...[c.joined, c.first_order, c.trade_at].filter(Boolean).map(Number)) || null)}</td></tr>`).join("")}
  </table></div>` : `<p class="empty">${q || tag || seg[0] !== "all" ? "No one matches these filters." : "No customers yet. People appear here as soon as they join the waitlist, order or ask about trade."}</p>`}
</section>`;
}

export async function customerPage(params) {
  const email = String(params.get("email") || "").toLowerCase().slice(0, 254);
  const c = await one(`SELECT * FROM (${PEOPLE}) WHERE email=?`, [email]);
  if (!c) return `<div class="head"><h1>Customer not found</h1></div><p><a class="btn line" href="/admin?tab=customers">Back to customers</a></p>`;
  const orders = await all("SELECT o.*, b.code AS batch_code FROM orders o LEFT JOIN batches b ON b.id=o.batch_id WHERE o.email=? ORDER BY o.created_at DESC", [email]);
  const notes = await all("SELECT * FROM customer_notes WHERE email=? ORDER BY created_at DESC", [email]);
  const jobs = await all("SELECT * FROM email_jobs WHERE email=? ORDER BY COALESCE(sent_at, send_at) DESC LIMIT 60", [email]);
  const sub = await one("SELECT * FROM subscribers WHERE email=?", [email]);
  const subOrders = orders.filter((o) => o.plan === "sub" && o.status !== "refunded" && !o.sub_ended_at);
  const subEnded = orders.find((o) => o.plan === "sub" && o.sub_ended_at);
  const flash = params.get("done");
  const errs = { confirm: "Type DELETE in capitals to confirm.", open: "This person has an order waiting to be dispatched. Dispatch or refund it first, then delete their data." };
  const msgs = { note: "Note added.", tags: "Tags saved.", unsub: "Unsubscribed from marketing emails. Queued emails were cancelled.", resub: "Resubscribed to launch emails.", noteDel: "Note deleted." };
  const jobState = (j) => j.sent_at ? `<span class="pill dispatched">Sent</span>` : j.cancelled_at ? `<span class="pill">Cancelled</span>` : j.error ? `<span class="pill refunded">Failing</span>` : `<span class="pill paid">Queued</span>`;
  const back = `<a class="note" href="/admin?tab=customers" style="text-decoration:none">← All customers</a>`;

  return `${back}
<div class="head"><div><h1>${esc(displayName(c) || c.email)}</h1><p class="note" style="margin-top:.4rem">${esc(c.email)} &nbsp; ${badges(c)}</p></div></div>
${flash && msgs[flash] ? `<p class="flash" role="status">${msgs[flash]}</p>` : ""}${flash && errs[flash] ? `<p class="flash err" role="alert">${errs[flash]}</p>` : ""}
<section class="kpis">
  <div class="card kpi dark"><div class="l">Total spent</div><div class="v">${gbp(c.spent)}</div><span class="d">${n(c.orders)} order${Number(c.orders) === 1 ? "" : "s"}</span></div>
  <div class="card kpi"><div class="l">Subscription</div><div class="v" style="font-size:1.9rem">${subOrders.length ? "Active" : "None"}</div><span class="d">${subOrders.length ? `Since ${fmtDay(subOrders[subOrders.length - 1].created_at)}` : subEnded ? `Cancelled ${fmtDay(subEnded.sub_ended_at)}` : "One-time or not yet ordered"}</span></div>
  <div class="card kpi"><div class="l">Marketing emails</div><div class="v" style="font-size:1.9rem">${sub ? (sub.status === "subscribed" ? "Opted in" : "Opted out") : "Not on list"}</div><span class="d">${sub ? `Joined ${fmtDay(sub.created_at)} · ${esc(sub.source || "website")}` : "Never joined the waitlist"}</span></div>
  <div class="card kpi"><div class="l">Last order</div><div class="v" style="font-size:1.9rem">${c.last_order ? fmtDay(c.last_order) : "—"}</div><span class="d">${c.first_order ? `First order ${fmtDay(c.first_order)}` : "No orders yet"}</span></div>
</section>
<section class="profile">
  <div class="card"><h2>Orders</h2>${orders.length ? `<div class="scroll"><table><tr><th>Order</th><th>Date</th><th>Plan</th><th class="num">Qty</th><th class="num">Total</th><th>Batch</th><th>Status</th></tr>
    ${orders.map((o) => `<tr><td>#${1000 + Number(o.id)}</td><td>${fmtDate(o.created_at)}</td><td>${o.plan === "sub" ? "Subscription" : "One-time"}</td><td class="num">${n(o.qty)}</td><td class="num">${gbp(o.amount_pence)}</td>
      <td>${o.batch_code ? `<a href="/admin?tab=stock#b-${esc(o.batch_code)}">${esc(o.batch_code)}</a>` : "—"}</td><td><span class="pill ${esc(o.status)}">${esc(o.status)}</span>${o.tracking ? `<br><span class="note">${esc(o.tracking)}</span>` : ""}</td></tr>`).join("")}
    </table></div>` : `<p class="empty">No orders yet.</p>`}</div>
  <div class="stack">
    <div class="card"><h2>Tags</h2>
      <div style="margin-bottom:.7rem">${tagList(c.tags) || `<span class="note">No tags yet.</span>`}</div>
      <form method="post" action="/admin/customers/tags" class="row"><input type="hidden" name="email" value="${esc(email)}">
        <label style="flex:1">Tags, separated by commas<input name="tags" value="${esc(c.tags || "")}" placeholder="vip, dentist, influencer"></label><button class="btn">Save tags</button></form></div>
    <div class="card"><h2>Notes</h2>
      <form method="post" action="/admin/customers/note" class="stack"><input type="hidden" name="email" value="${esc(email)}">
        <label class="sr" for="nt">New note</label><textarea id="nt" name="note" maxlength="2000" placeholder="Called about delivery. Prefers Tuesday dispatch." required></textarea>
        <div><button class="btn">Add note</button></div></form>
      ${notes.length ? `<ul class="notes" style="margin-top:1rem">${notes.map((x) => `<li><time>${fmtDate(x.created_at)}</time>${esc(x.note).replace(/\n/g, "<br>")}
        <form method="post" action="/admin/customers/note-delete" style="display:inline"><input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="id" value="${Number(x.id)}"><button class="note" style="background:none;border:0;cursor:pointer;text-decoration:underline">Delete</button></form></li>`).join("")}</ul>` : ""}</div>
  </div>
</section>
<section class="grid2">
  <div class="card"><h2>Emails</h2>${jobs.length ? `<ul class="timeline">${jobs.map((j) => `<li><span class="note">${fmtDate(j.sent_at || j.cancelled_at || j.send_at)}</span><span>${esc(j.template)} <span class="note">· ${esc(j.flow)}</span></span>${jobState(j)}</li>`).join("")}</ul>` : `<p class="empty">No emails for this person.</p>`}</div>
  <div class="stack">
    <div class="card"><h2>Marketing</h2>
      ${sub ? (sub.status === "subscribed"
        ? `<p class="note">Receives waitlist and launch emails. Unsubscribing cancels anything queued.</p><form method="post" action="/admin/customers/unsubscribe"><input type="hidden" name="email" value="${esc(email)}"><button class="btn line">Unsubscribe from marketing</button></form>`
        : `<p class="note">Opted out ${fmtDay(sub.unsubscribed_at)}. Only resubscribe if they have asked you to.</p><form method="post" action="/admin/customers/resubscribe"><input type="hidden" name="email" value="${esc(email)}"><button class="btn line">Resubscribe (they asked)</button></form>`)
        : `<p class="note">Not on the marketing list. People join it themselves on the website.</p>`}
    </div>
    <div class="card danger"><h2>Delete personal data</h2>
      <p class="note">For a privacy request. Removes their waitlist entry, notes, tags, trade enquiries and queued emails, and anonymises their orders (totals are kept for your accounts). This cannot be undone.</p>
      <form method="post" action="/admin/customers/erase" class="row" style="margin-top:.6rem"><input type="hidden" name="email" value="${esc(email)}">
        <label>Type DELETE to confirm<input name="confirm" autocomplete="off" required></label><button class="btn red">Delete data</button></form>
    </div>
  </div>
</section>`;
}

export async function customerAction(action, f) {
  const email = String(f.email || "").toLowerCase().trim().slice(0, 254);
  if (!email) return "/admin?tab=customers";
  const back = (done) => `/admin?tab=customer&email=${encodeURIComponent(email)}${done ? "&done=" + done : ""}`;
  const now = Date.now();
  if (action === "note") {
    const note = String(f.note || "").replace(/\r/g, "").trim().slice(0, 2000);
    if (note) await run("INSERT INTO customer_notes (email, note, created_at) VALUES (?,?,?)", [email, note, now]);
    return back("note");
  }
  if (action === "note-delete") { await run("DELETE FROM customer_notes WHERE id=? AND email=?", [Number(f.id), email]); return back("noteDel"); }
  if (action === "tags") {
    await run("INSERT INTO customer_meta (email, tags, updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET tags=excluded.tags, updated_at=excluded.updated_at", [email, cleanTags(f.tags), now]);
    return back("tags");
  }
  if (action === "unsubscribe") {
    await run("UPDATE subscribers SET status='unsubscribed', unsubscribed_at=? WHERE email=?", [now, email]);
    await run("UPDATE email_jobs SET cancelled_at=? WHERE email=? AND flow != 'welcome' AND sent_at IS NULL AND cancelled_at IS NULL", [now, email]);
    return back("unsub");
  }
  if (action === "resubscribe") { await run("UPDATE subscribers SET status='subscribed', unsubscribed_at=NULL WHERE email=?", [email]); return back("resub"); }
  if (action === "erase") {
    if (String(f.confirm || "").trim() !== "DELETE") return back("confirm");
    if (await one("SELECT 1 FROM orders WHERE email=? AND status='paid'", [email])) return back("open");
    await run("DELETE FROM subscribers WHERE email=?", [email]);
    await run("DELETE FROM customer_notes WHERE email=?", [email]);
    await run("DELETE FROM customer_meta WHERE email=?", [email]);
    await run("DELETE FROM trade_leads WHERE email=?", [email]);
    await run("DELETE FROM email_jobs WHERE email=? AND sent_at IS NULL", [email]);
    await run("UPDATE email_jobs SET email='deleted' WHERE email=?", [email]);
    await run("UPDATE orders SET email='deleted', name='', address=NULL WHERE email=?", [email]);
    return "/admin?tab=customers&erased=1";
  }
  return back("");
}

export async function customersCsv() {
  const rows = await all(`SELECT * FROM (${PEOPLE}) ORDER BY COALESCE(last_order, joined, trade_at) DESC`);
  const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const iso = (ms) => (ms ? new Date(Number(ms)).toISOString() : "");
  return ["email,name,marketing,customer,subscriber,trade,orders,spent_gbp,first_order,last_order,joined_waitlist,tags"].concat(rows.map((c) =>
    [c.email, displayName(c), c.sub_status || "", Number(c.orders) ? "yes" : "no", Number(c.is_sub) ? "yes" : "no", Number(c.is_trade) ? "yes" : "no",
     c.orders, (Number(c.spent) / 100).toFixed(2), iso(c.first_order), iso(c.last_order), iso(c.joined), c.tags || ""].map(cell).join(","))).join("\n");
}

/* ================================================================ STOCK */
const REMAINING = "(SELECT COALESCE(SUM(delta),0) FROM stock_moves m WHERE m.batch_id=b.id)";
const today = () => new Date().toISOString().slice(0, 10);

export async function batchesWithStock() {
  return all(`SELECT b.*, ${REMAINING} AS remaining,
    (SELECT COALESCE(-SUM(delta),0) FROM stock_moves m WHERE m.batch_id=b.id AND m.reason='order') AS sold
    FROM batches b ORDER BY COALESCE(b.best_before, '9999'), b.received_at`);
}

// Released, in date, enough left: earliest best-before first (first expiry, first out).
export async function pickBatch(qty) {
  const rows = await all(`SELECT b.*, ${REMAINING} AS remaining FROM batches b WHERE b.status='released'
    AND (b.best_before IS NULL OR b.best_before >= ?) ORDER BY COALESCE(b.best_before, '9999'), b.received_at`, [today()]);
  return rows.filter((b) => Number(b.remaining) >= qty);
}

export async function stockSummary() {
  const rows = await batchesWithStock();
  const t = today();
  const available = rows.filter((b) => b.status === "released" && (!b.best_before || b.best_before >= t)).reduce((s, b) => s + Math.max(0, Number(b.remaining)), 0);
  const testing = rows.filter((b) => b.status === "testing").reduce((s, b) => s + Math.max(0, Number(b.remaining)), 0);
  const sold30 = await one("SELECT COALESCE(-SUM(delta),0) AS n FROM stock_moves WHERE reason='order' AND created_at >= ?", [Date.now() - 30 * DAY]);
  const perDay = Number(sold30.n) / 30;
  const threshold = Number(await setting("low_stock", 50));
  return { rows, available, testing, perDay, cover: perDay > 0 ? Math.floor(available / perDay) : null, threshold, low: rows.length > 0 && available < threshold };
}

export async function stockPage(params) {
  const s = await stockSummary();
  const t = today();
  const soon = s.rows.filter((b) => b.best_before && b.best_before >= t && b.best_before <= new Date(Date.now() + 90 * DAY).toISOString().slice(0, 10) && Number(b.remaining) > 0);
  const moves = await all(`SELECT m.*, b.code FROM stock_moves m JOIN batches b ON b.id=m.batch_id ORDER BY m.created_at DESC LIMIT 60`);
  const flash = params.get("done"), err = params.get("err");
  const msgs = { received: "Delivery recorded.", coa: "Certificate uploaded.", status: "Batch status changed.", adjust: "Stock adjusted.", threshold: "Low-stock level saved.", coaDel: "Certificate removed." };
  const errs = { code: "Use a batch code of 2 to 40 letters, numbers, dashes, dots or slashes.", dup: "That batch code already exists. Use Adjust to add more stock to it.", qty: "Enter a whole number of tubs above zero.", date: "Use the date picker for the dates.", file: "Upload a PDF, PNG or JPG under 10 MB.", stock: "That would take the batch below zero." };
  const reasonName = { received: "Delivery in", order: "Order", damaged: "Damaged", sample: "Samples / gifts", count: "Stock count correction", returned: "Returned" };
  const statusName = { testing: "In testing", released: "Released", recalled: "Recalled" };
  const expired = (b) => b.best_before && b.best_before < t;

  return `<div class="head"><div><h1>Stock &amp; batches</h1><p class="note" style="margin-top:.4rem">Every tub traceable from the delivery from your manufacturer to the customer's door.</p></div></div>
${flash && msgs[flash] ? `<p class="flash" role="status">${msgs[flash]}</p>` : ""}${err && errs[err] ? `<p class="flash err" role="alert">${errs[err]}</p>` : ""}
<section class="kpis">
  <div class="card kpi dark"><div class="l">Ready to sell</div><div class="v">${n(s.available)}</div><span class="d">Tubs in released, in-date batches</span></div>
  <div class="card kpi"><div class="l">In testing</div><div class="v">${n(s.testing)}</div><span class="d">Waiting for the certificate before release</span></div>
  <div class="card kpi"><div class="l">Stock cover</div><div class="v">${s.cover === null ? "—" : n(s.cover) + "<sup style='font-size:.4em'> days</sup>"}</div><span class="d">${s.perDay > 0 ? `At ${s.perDay.toFixed(1)} tubs a day (last 30 days)` : "Appears once orders are dispatched"}</span></div>
  <div class="card kpi"><div class="l">Low-stock level</div><div class="v">${n(s.threshold)}</div><span class="d">${s.low ? `<span class="pill low">Below level: reorder</span>` : s.rows.length ? "Stock is above this level" : "Alerts once you add a batch"}</span></div>
</section>
${soon.length ? `<p class="flash err" role="status">Best-before within 90 days: ${soon.map((b) => `${esc(b.code)} (${fmtISO(b.best_before)}, ${n(b.remaining)} left)`).join(" · ")}</p>` : ""}
<section class="card"><h2>Batches</h2>
${s.rows.length ? `<div class="scroll"><table><tr><th>Batch</th><th>Made</th><th>Best before</th><th class="num">Received</th><th class="num">Sold</th><th class="num">Left</th><th>Status</th><th>Certificate</th><th>Change</th></tr>
${s.rows.map((b) => {
  const left = Number(b.remaining), pctLeft = b.qty_received ? Math.max(0, Math.min(100, (left / Number(b.qty_received)) * 100)) : 0;
  return `<tr id="b-${esc(b.code)}"><td><b style="font-weight:400">${esc(b.code)}</b>${b.notes ? `<br><span class="note">${esc(b.notes)}</span>` : ""}</td>
  <td>${fmtISO(b.made_on)}</td><td>${fmtISO(b.best_before)}${expired(b) ? ` <span class="pill expired">Expired</span>` : ""}</td>
  <td class="num">${n(b.qty_received)}</td><td class="num">${n(b.sold)}</td><td class="num">${n(left)}<div class="meter" style="margin-top:.3rem"><i style="width:${pctLeft.toFixed(0)}%"></i></div></td>
  <td><span class="pill ${esc(b.status)}">${statusName[b.status] || esc(b.status)}</span></td>
  <td>${b.coa_file ? `<a href="/admin/coa/${Number(b.id)}" target="_blank" rel="noopener">${esc(b.coa_name || "Certificate")}</a><br><span class="note">${fmtDay(b.coa_uploaded_at)}</span>
      <form method="post" action="/admin/stock/coa-delete" style="display:inline"><input type="hidden" name="id" value="${Number(b.id)}"><button class="note" style="background:none;border:0;cursor:pointer;text-decoration:underline;padding:0">Remove</button></form>`
    : `<form method="post" action="/admin/stock/coa" enctype="multipart/form-data" class="row"><input type="hidden" name="id" value="${Number(b.id)}">
      <label class="sr" for="coa${b.id}">Certificate file</label><input id="coa${b.id}" type="file" name="file" accept="application/pdf,image/png,image/jpeg" required style="max-width:12rem"><button class="btn line">Upload</button></form>`}</td>
  <td><form method="post" action="/admin/stock/status" class="row"><input type="hidden" name="id" value="${Number(b.id)}">
      <label class="sr" for="st${b.id}">Status</label><select id="st${b.id}" name="status">${Object.entries(statusName).map(([k, l]) => `<option value="${k}" ${k === b.status ? "selected" : ""}>${l}</option>`).join("")}</select><button class="btn line">Save</button></form></td></tr>`;
}).join("")}</table></div>
<p class="note" style="margin-top:.8rem">Released batches with a certificate can be looked up by customers on the website by batch code. Orders take stock from the released, in-date batch with the earliest best-before date.</p>`
: `<p class="empty">No batches yet. Record your first delivery below.</p>`}
</section>
<section class="grid2">
  <div class="card"><h2>Record a delivery</h2>
    <form method="post" action="/admin/stock/receive" enctype="multipart/form-data" class="stack">
      <div class="row">
        <label>Batch code<input name="code" required maxlength="40" placeholder="e.g. JMV02-2601"></label>
        <label>Tubs received<input name="qty" type="number" min="1" step="1" required style="width:8rem"></label>
      </div>
      <div class="row">
        <label>Made on<input name="made_on" type="date"></label>
        <label>Best before<input name="best_before" type="date"></label>
        <label>Status<select name="status"><option value="testing">In testing</option><option value="released">Released</option></select></label>
      </div>
      <label class="row" style="display:grid;gap:.25rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Certificate of analysis (optional, PDF/PNG/JPG)<input type="file" name="file" accept="application/pdf,image/png,image/jpeg"></label>
      <label class="row" style="display:grid;gap:.25rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Notes<input name="notes" maxlength="200" placeholder="Delivery note number, pallet count…"></label>
      <div><button class="btn">Record delivery</button></div>
    </form></div>
  <div class="stack">
    <div class="card"><h2>Adjust stock</h2>
      ${s.rows.length ? `<form method="post" action="/admin/stock/adjust" class="stack">
        <div class="row">
          <label>Batch<select name="id">${s.rows.map((b) => `<option value="${Number(b.id)}">${esc(b.code)} (${n(b.remaining)} left)</option>`).join("")}</select></label>
          <label>Change<input name="delta" type="number" step="1" required placeholder="-3 or 12" style="width:7rem"></label>
          <label>Reason<select name="reason"><option value="damaged">Damaged</option><option value="sample">Samples / gifts</option><option value="count">Stock count correction</option><option value="returned">Returned</option><option value="received">Extra delivery</option></select></label>
        </div>
        <label class="row" style="display:grid;gap:.25rem;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)">Note<input name="note" maxlength="200"></label>
        <div><button class="btn">Save adjustment</button></div></form>` : `<p class="note">Add a batch first.</p>`}
    </div>
    <div class="card"><h2>Low-stock level</h2>
      <form method="post" action="/admin/stock/threshold" class="row"><label>Warn me below<input name="threshold" type="number" min="0" step="1" value="${Number(s.threshold)}" style="width:8rem"></label><button class="btn line">Save</button></form></div>
  </div>
</section>
<section class="card"><h2>Stock movements</h2>
${moves.length ? `<div class="scroll"><table><tr><th>When</th><th>Batch</th><th>Movement</th><th class="num">Tubs</th><th>Note</th></tr>
${moves.map((m) => `<tr><td>${fmtDate(m.created_at)}</td><td>${esc(m.code)}</td><td>${reasonName[m.reason] || esc(m.reason)}${m.order_id ? ` <span class="note">#${1000 + Number(m.order_id)}</span>` : ""}</td>
  <td class="num ${Number(m.delta) < 0 ? "down" : "up"}">${Number(m.delta) > 0 ? "+" : ""}${n(m.delta)}</td><td class="note">${esc(m.note || "")}</td></tr>`).join("")}</table></div>` : `<p class="empty">No movements yet.</p>`}
</section>`;
}

/* ---- file handling for certificates ---- */
function sniff(buf) {
  if (buf.subarray(0, 4).toString() === "%PDF") return { ext: ".pdf", type: "application/pdf" };
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === "PNG") return { ext: ".png", type: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: ".jpg", type: "image/jpeg" };
  return null;
}
export const COA_TYPES = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg" };
async function saveCoa(file) {
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) return null;
  if (file.size > 10 * 1024 * 1024) return { error: "file" };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return { error: "file" };
  const name = crypto.randomBytes(12).toString("hex") + kind.ext;
  await writeFile(join(UPLOADS, name), buf);
  return { name, original: String(file.name || "certificate" + kind.ext).replace(/[^\w .()-]/g, "").slice(0, 80) || "certificate" + kind.ext };
}

export async function stockAction(action, f) {
  const go = (q) => "/admin?tab=stock&" + q;
  const now = Date.now();
  if (action === "receive") {
    const code = String(f.code || "").trim();
    const qty = parseInt(f.qty, 10);
    if (!CODE_RE.test(code)) return go("err=code");
    if (!(qty > 0 && qty < 1e6)) return go("err=qty");
    for (const d of [f.made_on, f.best_before]) if (d && !DATE_RE.test(String(d))) return go("err=date");
    if (await one("SELECT 1 FROM batches WHERE lower(code)=lower(?)", [code])) return go("err=dup");
    const coa = await saveCoa(f.file);
    if (coa && coa.error) return go("err=file");
    const status = f.status === "released" ? "released" : "testing";
    const r = await run(`INSERT INTO batches (code, made_on, best_before, qty_received, received_at, status, coa_file, coa_name, coa_uploaded_at, notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [code, f.made_on || null, f.best_before || null, qty, now, status, coa ? coa.name : null, coa ? coa.original : null, coa ? now : null, String(f.notes || "").trim().slice(0, 200) || null]);
    await run("INSERT INTO stock_moves (batch_id, delta, reason, note, created_at) VALUES (?,?,?,?,?)", [Number(r.lastInsertRowid), qty, "received", "Delivery recorded", now]);
    return go("done=received");
  }
  if (action === "coa") {
    const coa = await saveCoa(f.file);
    if (!coa || coa.error) return go("err=file");
    const old = await one("SELECT coa_file FROM batches WHERE id=?", [Number(f.id)]);
    await run("UPDATE batches SET coa_file=?, coa_name=?, coa_uploaded_at=? WHERE id=?", [coa.name, coa.original, now, Number(f.id)]);
    if (old && old.coa_file) await unlink(join(UPLOADS, old.coa_file)).catch(() => {});
    return go("done=coa");
  }
  if (action === "coa-delete") {
    const old = await one("SELECT coa_file FROM batches WHERE id=?", [Number(f.id)]);
    await run("UPDATE batches SET coa_file=NULL, coa_name=NULL, coa_uploaded_at=NULL WHERE id=?", [Number(f.id)]);
    if (old && old.coa_file) await unlink(join(UPLOADS, old.coa_file)).catch(() => {});
    return go("done=coaDel");
  }
  if (action === "status") {
    const st = ["testing", "released", "recalled"].includes(f.status) ? f.status : "testing";
    await run("UPDATE batches SET status=? WHERE id=?", [st, Number(f.id)]);
    return go("done=status");
  }
  if (action === "adjust") {
    const delta = parseInt(f.delta, 10);
    if (!delta || Math.abs(delta) > 1e6) return go("err=qty");
    const reason = ["damaged", "sample", "count", "returned", "received"].includes(f.reason) ? f.reason : "count";
    const b = await one(`SELECT b.id, ${REMAINING} AS remaining FROM batches b WHERE b.id=?`, [Number(f.id)]);
    if (!b) return go("err=qty");
    if (Number(b.remaining) + delta < 0) return go("err=stock");
    await run("INSERT INTO stock_moves (batch_id, delta, reason, note, created_at) VALUES (?,?,?,?,?)", [b.id, delta, reason, String(f.note || "").trim().slice(0, 200) || null, now]);
    return go("done=adjust");
  }
  if (action === "threshold") {
    const v = parseInt(f.threshold, 10);
    if (v >= 0 && v < 1e6) await setSetting("low_stock", v);
    return go("done=threshold");
  }
  return go("");
}

// Dispatch an order from a batch: records the movement and links the batch to the order.
export async function dispatchFromBatch(orderId, batchId, qty, now) {
  if (!batchId) return { ok: true };
  const b = await one(`SELECT b.id, ${REMAINING} AS remaining FROM batches b WHERE b.id=? AND b.status='released'`, [batchId]);
  if (!b || Number(b.remaining) < qty) return { ok: false };
  await run("INSERT INTO stock_moves (batch_id, delta, reason, order_id, created_at) VALUES (?,?,?,?,?)", [b.id, -qty, "order", orderId, now]);
  await run("UPDATE orders SET batch_id=? WHERE id=?", [b.id, orderId]);
  return { ok: true };
}

// Public batch lookup for the website.
export async function publicBatch(code) {
  const b = await one("SELECT * FROM batches WHERE lower(code)=lower(?)", [code]);
  if (!b) return { found: false };
  if (b.status === "recalled") return { found: true, status: "recalled", code: b.code };
  if (b.status !== "released") return { found: true, status: "testing", code: b.code };
  return { found: true, status: "released", code: b.code, made_on: b.made_on, best_before: b.best_before, certificate: b.coa_file ? `/coa/${encodeURIComponent(b.code)}` : null };
}
