// Admin dashboard at /admin: sales and waitlist metrics, subscribers, orders and dispatch, trade leads, email queue.
import { one, all } from "./db.js";
import { FLOWS } from "./mail.js";
import { BACKOFFICE_CSS, customersPage, customerPage, stockPage, stockSummary, pickBatch } from "./backoffice.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DAY = 86400e3;
const fmtDate = (ms) => ms ? new Date(Number(ms)).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDay = (ms) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });
const gbp = (pence) => "£" + (Number(pence || 0) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n = (v) => Number(v || 0).toLocaleString("en-GB");
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + "%" : "—");

const CSS = `
:root{--bg:#E6E5DE;--paper:#F3F2EC;--ink:#17241D;--muted:#5A665E;--forest:#1E392C;--deep:#11231A;--gold:#9A7843;--gold-soft:#CDB07A;--line:rgba(23,36,29,.12);--good:#2F7A4D;--bad:#A4453A}
@media (prefers-color-scheme:dark){:root{--bg:#0F1713;--paper:#162019;--ink:#E7E4DA;--muted:#A0ABA3;--forest:#1F3B2E;--deep:#0A1610;--gold:#CDB07A;--line:rgba(231,228,218,.12);--good:#6FBF8E;--bad:#E08A7F;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:300 15px/1.55 Jost,"Avenir Next","Segoe UI",system-ui,sans-serif}
a{color:inherit}h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;margin:0;line-height:1.05}
.top{background:var(--deep);color:#EEEBE1;padding:0 max(16px,3vw)}.top .in{max-width:1320px;margin:auto;display:flex;align-items:center;gap:1.5rem;height:64px}
.wm{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.35rem;letter-spacing:.32em;text-decoration:none}.wm small{font-family:Jost,system-ui;letter-spacing:.2em;font-size:.62rem;color:var(--gold-soft);margin-left:.6rem;vertical-align:middle}
nav.tabs{display:flex;gap:.3rem;margin-left:auto;overflow-x:auto}nav.tabs a{text-decoration:none;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;padding:.55rem .9rem;border-radius:999px;color:#B7BFB4;white-space:nowrap}
nav.tabs a.on{background:var(--gold-soft);color:#13201A}
.top form button{background:none;border:1px solid rgba(238,235,225,.25);color:#B7BFB4;border-radius:999px;padding:.45rem .9rem;font:inherit;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
main{max-width:1320px;margin:auto;padding:28px max(16px,3vw) 80px;display:grid;gap:18px}
.head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:1rem;margin-top:8px}.head h1{font-size:clamp(2rem,4vw,3rem)}
.range{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:3px;background:var(--paper)}.range a{text-decoration:none;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:.45rem .85rem;border-radius:999px;color:var(--muted)}.range a.on{background:var(--forest);color:#EEEBE1}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:18px 20px;min-width:0}
.kpi .l{font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}.kpi .v{font-family:"Cormorant Garamond",Georgia,serif;font-size:2.6rem;line-height:1;margin-top:.5rem;font-variant-numeric:tabular-nums}
.kpi .d{font-size:.8rem;margin-top:.4rem;color:var(--muted)}.up{color:var(--good)}.down{color:var(--bad)}
.kpi.dark{background:var(--forest);color:#EEEBE1;border-color:transparent}.kpi.dark .l{color:var(--gold-soft)}.kpi.dark .d{color:#B7BFB4}
.grid2{display:grid;grid-template-columns:1.6fr 1fr;gap:12px}.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.card h2{font-size:1.6rem;margin-bottom:.8rem}.card h2 small{font-family:Jost,system-ui;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-left:.5rem}
.chart svg{width:100%;height:auto;display:block}.legend{display:flex;gap:1.2rem;font-size:.78rem;color:var(--muted);margin-top:.4rem}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:.4rem;vertical-align:-1px}
.funnel{display:grid;gap:.7rem}.funnel .row{display:grid;grid-template-columns:7.5rem 1fr 4.5rem;gap:.8rem;align-items:center;font-size:.88rem}
.bar{height:12px;border-radius:6px;background:var(--line);overflow:hidden}.bar i{display:block;height:100%;background:var(--forest);border-radius:6px}
.funnel .row b{font-weight:400;text-align:right;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:.9rem}th{text-align:left;font-weight:400;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);padding:.5rem .6rem;border-bottom:1px solid var(--line)}
td{padding:.65rem .6rem;border-bottom:1px solid var(--line);vertical-align:top}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}.scroll{overflow-x:auto}
.pill{display:inline-block;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;padding:.2rem .6rem;background:var(--line)}
.pill.paid{background:#E9D9B2;color:#4A3B17}.pill.dispatched,.pill.subscribed{background:#CFE3D4;color:#1D4A2E}.pill.unsubscribed,.pill.refunded{background:#EED3CE;color:#6A2A22}
.empty{color:var(--muted);padding:1.4rem 0;text-align:center}
.tools{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;margin-bottom:.8rem}
input,select{font:inherit;padding:.6rem .9rem;border:1px solid var(--line);border-radius:999px;background:var(--bg);color:var(--ink);min-width:0}
.btn{display:inline-block;font:inherit;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;background:var(--forest);color:#EEEBE1;border:0;border-radius:999px;padding:.65rem 1.1rem;cursor:pointer}
.btn.line{background:none;border:1px solid var(--line);color:var(--ink)}
.status{display:flex;flex-wrap:wrap;gap:.5rem}.status span{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:.3rem .75rem;color:var(--muted)}.status b{font-weight:400;color:var(--ink)}
.note{font-size:.84rem;color:var(--muted)}
@media (max-width:1000px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.grid2,.grid3{grid-template-columns:1fr}}
@media (max-width:520px){.kpis{grid-template-columns:1fr}.top .in{flex-wrap:wrap;height:auto;padding:.8rem 0}nav.tabs{order:3;width:100%;margin-left:0}}
`;

function shell(title, tab, body) {
  const tabs = [["overview", "Overview"], ["orders", "Orders"], ["customers", "Customers"], ["stock", "Stock"], ["subscribers", "Waitlist"], ["trade", "Trade"], ["emails", "Emails"]];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Jamivia Admin</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Jost:wght@300;400&display=swap">
<style>${CSS}${BACKOFFICE_CSS}</style></head><body>
<header class="top"><div class="in"><a class="wm" href="/admin">JAMIVIA<small>ADMIN</small></a>
<nav class="tabs" aria-label="Sections">${tabs.map(([k, l]) => `<a href="/admin?tab=${k}" class="${k === tab || (tab === "customer" && k === "customers") ? "on" : ""}">${l}</a>`).join("")}</nav>
<form method="post" action="/admin/logout"><button>Sign out</button></form></div></header>
<main>${body}</main></body></html>`;
}

export function renderLogin(error = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in · Jamivia Admin</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&family=Jost:wght@300;400&display=swap">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1E392C;color:#EEEBE1;font:300 15px/1.5 Jost,system-ui,sans-serif;padding:20px}
form{width:min(380px,100%);display:grid;gap:.9rem;background:#11231A;border:1px solid rgba(205,176,122,.3);border-radius:24px;padding:2rem}
h1{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;font-size:2.2rem;margin:0}.wm{letter-spacing:.4em;font-size:.8rem;color:#CDB07A}
label{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:#B7BFB4;display:grid;gap:.4rem}
input{font:inherit;padding:.85rem 1rem;border-radius:999px;border:1px solid rgba(238,235,225,.22);background:rgba(0,0,0,.2);color:#EEEBE1}
button{font:inherit;letter-spacing:.18em;text-transform:uppercase;font-size:.76rem;background:#CDB07A;color:#13201A;border:0;border-radius:999px;padding:1rem;cursor:pointer;margin-top:.4rem}
.err{color:#F0B2A8;font-size:.88rem;margin:0}</style></head><body>
<form method="post" action="/admin/login"><span class="wm">JAMIVIA</span><h1>Admin sign in</h1>
${error ? `<p class="err" role="alert">${esc(error)}</p>` : ""}
<label>Email<input type="email" name="email" autocomplete="username" required></label>
<label>Password<input type="password" name="password" autocomplete="current-password" required></label>
<button>Sign in</button></form></body></html>`;
}

/* ---------------- overview ---------------- */
async function stats(from, to) {
  const [v] = await all("SELECT COUNT(DISTINCT sid) AS visitors, COUNT(*) AS views FROM events WHERE type='view' AND ts>=? AND ts<?", [from, to]);
  const [c] = await all("SELECT COUNT(DISTINCT sid) AS carts FROM events WHERE type='add_to_cart' AND ts>=? AND ts<?", [from, to]);
  const [k] = await all("SELECT COUNT(DISTINCT sid) AS checkouts FROM events WHERE type='begin_checkout' AND ts>=? AND ts<?", [from, to]);
  const [s] = await all("SELECT COUNT(*) AS signups FROM subscribers WHERE created_at>=? AND created_at<?", [from, to]);
  const [o] = await all("SELECT COUNT(*) AS orders, COALESCE(SUM(amount_pence),0) AS revenue, SUM(CASE WHEN plan='sub' THEN 1 ELSE 0 END) AS subs FROM orders WHERE status!='refunded' AND created_at>=? AND created_at<?", [from, to]);
  return { visitors: Number(v.visitors), views: Number(v.views), carts: Number(c.carts), checkouts: Number(k.checkouts),
    signups: Number(s.signups), orders: Number(o.orders), revenue: Number(o.revenue), subs: Number(o.subs || 0) };
}

function delta(cur, prev) {
  if (!prev && !cur) return `<span class="d">No change</span>`;
  if (!prev) return `<span class="d up">New this period</span>`;
  const d = ((cur - prev) / prev) * 100;
  return `<span class="d ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(0)}% vs previous period</span>`;
}

function chart(days, from) {
  const W = 760, H = 240, pl = 34, pr = 10, pt = 12, pb = 26;
  const maxV = Math.max(4, ...days.map((d) => d.visitors)), maxS = Math.max(2, ...days.map((d) => d.signups));
  const step = (W - pl - pr) / days.length, bw = Math.max(2, step * 0.62);
  const y = (v) => pt + (H - pt - pb) * (1 - v / maxV);
  const ys = (v) => pt + (H - pt - pb) * (1 - v / maxS);
  const ticks = [0, Math.round(maxV / 2), maxV];
  let g = ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="currentColor" opacity=".1"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".55">${t}</text>`).join("");
  g += days.map((d, i) => `<rect x="${(pl + i * step + (step - bw) / 2).toFixed(1)}" y="${y(d.visitors).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - pb - y(d.visitors)).toFixed(1)}" rx="2" fill="#1E392C" opacity=".85"><title>${fmtDay(d.day)}: ${d.visitors} visitors, ${d.signups} sign-ups</title></rect>`).join("");
  const pts = days.map((d, i) => `${(pl + i * step + step / 2).toFixed(1)},${ys(d.signups).toFixed(1)}`).join(" ");
  g += `<polyline points="${pts}" fill="none" stroke="#B8924F" stroke-width="2.2" stroke-linejoin="round"/>`;
  g += days.map((d, i) => d.signups ? `<circle cx="${(pl + i * step + step / 2).toFixed(1)}" cy="${ys(d.signups).toFixed(1)}" r="3" fill="#B8924F"/>` : "").join("");
  const every = Math.ceil(days.length / 7);
  g += days.map((d, i) => i % every === 0 ? `<text x="${(pl + i * step + step / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".55">${fmtDay(d.day)}</text>` : "").join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily visitors and sign-ups">${g}</svg>`;
}

async function overview(params) {
  const range = [7, 30, 90].includes(Number(params.get("days"))) ? Number(params.get("days")) : 30;
  const now = Date.now(), from = now - range * DAY, prevFrom = from - range * DAY;
  const [cur, prev] = await Promise.all([stats(from, now), stats(prevFrom, from)]);
  const totalSubs = await one("SELECT COUNT(*) AS n FROM subscribers WHERE status='subscribed'");
  const toDispatch = await one("SELECT COUNT(*) AS n FROM orders WHERE status='paid'");
  const stock = await stockSummary();

  // daily series (London days approximated by UTC day buckets)
  const startDay = Math.floor(from / DAY) * DAY;
  const vRows = await all("SELECT CAST(ts/86400000 AS INTEGER) AS d, COUNT(DISTINCT sid) AS n FROM events WHERE type='view' AND ts>=? GROUP BY d", [startDay]);
  const sRows = await all("SELECT CAST(created_at/86400000 AS INTEGER) AS d, COUNT(*) AS n FROM subscribers WHERE created_at>=? GROUP BY d", [startDay]);
  const vm = new Map(vRows.map((r) => [Number(r.d), Number(r.n)])), sm = new Map(sRows.map((r) => [Number(r.d), Number(r.n)]));
  const days = [];
  for (let d = startDay; d <= now; d += DAY) days.push({ day: d, visitors: vm.get(d / DAY) || 0, signups: sm.get(d / DAY) || 0 });

  const sources = await all(`
    SELECT src, COUNT(DISTINCT v.sid) AS visitors, COUNT(DISTINCT s.sid) AS signups FROM (
      SELECT sid, COALESCE(NULLIF(MAX(utm_source),''), NULLIF(MAX(referrer),''), 'Direct') AS src FROM events WHERE type='view' AND ts>=? GROUP BY sid
    ) v LEFT JOIN (SELECT DISTINCT sid FROM events WHERE type='signup' AND ts>=?) s ON s.sid=v.sid
    GROUP BY src ORDER BY visitors DESC LIMIT 8`, [from, from]);
  const devices = await all("SELECT device, COUNT(DISTINCT sid) AS n FROM events WHERE type='view' AND ts>=? GROUP BY device ORDER BY n DESC", [from]);
  const recentSubs = await all("SELECT email, first_name, source, created_at FROM subscribers ORDER BY created_at DESC LIMIT 6");
  const recentOrders = await all("SELECT o.*, b.code AS batch_code FROM orders o LEFT JOIN batches b ON b.id=o.batch_id ORDER BY o.created_at DESC LIMIT 6");

  const aov = cur.orders ? cur.revenue / cur.orders : 0;
  const funnel = [["Visitors", cur.visitors], ["Joined waitlist", cur.signups], ["Added to bag", cur.carts], ["Started checkout", cur.checkouts], ["Ordered", cur.orders]];
  const fmax = Math.max(1, cur.visitors);
  const devTotal = devices.reduce((a, d) => a + Number(d.n), 0);

  return `
<div class="head"><div><span class="note">Last ${range} days</span><h1>Overview</h1></div>
<div class="range">${[7, 30, 90].map((d) => `<a href="/admin?tab=overview&days=${d}" class="${d === range ? "on" : ""}">${d} days</a>`).join("")}</div></div>
${stock.low ? `<p class="flash err" role="status">Low stock: ${n(stock.available)} tubs ready to sell, below your level of ${n(stock.threshold)}. <a href="/admin?tab=stock" style="color:inherit">Open stock →</a></p>` : ""}
<section class="kpis">
  <div class="card kpi dark"><div class="l">Revenue</div><div class="v">${gbp(cur.revenue)}</div>${delta(cur.revenue, prev.revenue)}</div>
  <div class="card kpi"><div class="l">Orders</div><div class="v">${n(cur.orders)}</div>${delta(cur.orders, prev.orders)}</div>
  <div class="card kpi"><div class="l">Average order</div><div class="v">${gbp(aov)}</div><span class="d">${n(cur.subs)} of ${n(cur.orders)} on subscription</span></div>
  <div class="card kpi"><div class="l">To dispatch</div><div class="v">${n(toDispatch.n)}</div><span class="d"><a href="/admin?tab=orders">Open orders →</a></span></div>
  <div class="card kpi"><div class="l">Visitors</div><div class="v">${n(cur.visitors)}</div>${delta(cur.visitors, prev.visitors)}</div>
  <div class="card kpi"><div class="l">Waitlist sign-ups</div><div class="v">${n(cur.signups)}</div>${delta(cur.signups, prev.signups)}</div>
  <div class="card kpi"><div class="l">Sign-up rate</div><div class="v">${pct(cur.signups, cur.visitors)}</div><span class="d">Of unique visitors</span></div>
  <div class="card kpi dark"><div class="l">On the waitlist</div><div class="v">${n(totalSubs.n)}</div><span class="d">Active subscribers, all time</span></div>
</section>
<section class="grid2">
  <div class="card chart"><h2>Traffic &amp; sign-ups <small>per day</small></h2>${chart(days, from)}
    <div class="legend"><span><i style="background:#1E392C"></i>Visitors</span><span><i style="background:#B8924F"></i>Waitlist sign-ups</span></div></div>
  <div class="card"><h2>Funnel</h2><div class="funnel">${funnel.map(([l, v]) => `<div class="row"><span>${l}</span><span class="bar"><i style="width:${((v / fmax) * 100).toFixed(1)}%"></i></span><b>${n(v)}</b></div>`).join("")}</div>
    <p class="note" style="margin-top:1rem">Conversion, visitor to order: <b>${pct(cur.orders, cur.visitors)}</b></p></div>
</section>
<section class="grid3">
  <div class="card"><h2>Traffic sources</h2>${sources.length ? `<table><tr><th>Source</th><th class="num">Visitors</th><th class="num">Sign-ups</th></tr>${sources.map((s) => `<tr><td>${esc(s.src)}</td><td class="num">${n(s.visitors)}</td><td class="num">${n(s.signups)}</td></tr>`).join("")}</table>` : `<p class="empty">No visits yet.</p>`}
    <p class="note">Tag social links with <code>?utm_source=tiktok</code> to see them here.</p></div>
  <div class="card"><h2>Devices</h2>${devTotal ? `<div class="funnel">${devices.map((d) => `<div class="row"><span style="text-transform:capitalize">${esc(d.device || "unknown")}</span><span class="bar"><i style="width:${((d.n / devTotal) * 100).toFixed(1)}%"></i></span><b>${pct(Number(d.n), devTotal)}</b></div>`).join("")}</div>` : `<p class="empty">No visits yet.</p>`}</div>
  <div class="card"><h2>Latest sign-ups</h2>${recentSubs.length ? `<table>${recentSubs.map((s) => `<tr><td>${esc(s.first_name || "")} <span class="note">${esc(s.email)}</span></td><td class="num note">${fmtDay(Number(s.created_at))}</td></tr>`).join("")}</table>` : `<p class="empty">No sign-ups yet.</p>`}</div>
</section>
<section class="card"><h2>Latest orders</h2>${ordersTable(recentOrders, false)}</section>`;
}

/* ---------------- orders ---------------- */
function ordersTable(rows, actions, batches = []) {
  if (!rows.length) return `<p class="empty">No orders yet. They appear here as soon as Stripe checkout is connected and someone buys.</p>`;
  return `<div class="scroll"><table><tr><th>Order</th><th>Date</th><th>Customer</th><th>Plan</th><th class="num">Qty</th><th class="num">Total</th><th>Status</th><th>Batch</th>${actions ? "<th>Ship to</th><th>Dispatch</th>" : ""}</tr>
${rows.map((o) => {
  let addr = "";
  try { const a = JSON.parse(o.address || "null"); if (a) addr = [a.line1, a.line2, a.city, a.postal_code].filter(Boolean).map(esc).join("<br>"); } catch {}
  return `<tr><td>#${1000 + Number(o.id)}</td><td>${fmtDate(o.created_at)}</td><td>${o.email && o.email !== "deleted" ? `<a href="/admin?tab=customer&email=${encodeURIComponent(o.email)}">${esc(o.name || o.email)}</a>` : esc(o.name || "Deleted")}<br><span class="note">${esc(o.email)}</span></td>
<td>${o.plan === "sub" ? "Subscription" : "One-time"}</td><td class="num">${n(o.qty)}</td><td class="num">${gbp(o.amount_pence)}</td>
<td><span class="pill ${esc(o.status)}">${esc(o.status)}</span>${o.tracking ? `<br><span class="note">${esc(o.tracking)}</span>` : ""}</td>
<td>${o.batch_code ? `<a href="/admin?tab=stock#b-${esc(o.batch_code)}">${esc(o.batch_code)}</a>` : "—"}</td>
${actions ? `<td class="note">${addr || "—"}</td><td>${o.status === "paid" ? `<form method="post" action="/admin/orders/${Number(o.id)}/dispatch" class="tools" style="margin:0"><label class="sr" for="tr${o.id}">Tracking number</label><input id="tr${o.id}" name="tracking" placeholder="Tracking no." style="width:9rem">${batchSelect(o, batches)}<button class="btn">Mark dispatched</button></form>` : fmtDate(o.dispatched_at)}</td>` : ""}</tr>`;
}).join("")}</table></div>`;
}

// Batch picker for dispatch: released, in-date batches with enough left, earliest best-before first (pre-selected).
function batchSelect(o, batches) {
  if (!batches.length) return "";
  const qty = Number(o.qty || 1);
  const ok = batches.filter((b) => Number(b.remaining) >= qty);
  return `<label class="sr" for="bt${o.id}">Batch</label><select id="bt${o.id}" name="batch_id">${ok.map((b, i) => `<option value="${Number(b.id)}" ${i === 0 ? "selected" : ""}>${esc(b.code)} · ${n(b.remaining)} left</option>`).join("")}<option value="">No batch (not tracked)</option></select>`;
}

async function orders(params) {
  const status = ["paid", "dispatched", "refunded"].includes(params.get("status")) ? params.get("status") : "";
  const rows = await all(`SELECT o.*, b.code AS batch_code FROM orders o LEFT JOIN batches b ON b.id=o.batch_id ${status ? "WHERE o.status=?" : ""} ORDER BY o.created_at DESC LIMIT 300`, status ? [status] : []);
  const batches = await pickBatch(1);
  const err = params.get("err");
  return `<div class="head"><h1>Orders</h1><div class="tools">
<div class="range">${[["", "All"], ["paid", "To dispatch"], ["dispatched", "Dispatched"]].map(([k, l]) => `<a href="/admin?tab=orders${k ? "&status=" + k : ""}" class="${k === status ? "on" : ""}">${l}</a>`).join("")}</div>
<a class="btn line" href="/admin/orders.csv">Export CSV</a></div></div>
${err === "batch" ? `<p class="flash err" role="alert">That batch no longer has enough released stock for the order. Pick another batch.</p>` : ""}
<section class="card">${ordersTable(rows, true, batches)}</section>`;
}

/* ---------------- subscribers ---------------- */
async function subscribers(params) {
  const q = (params.get("q") || "").trim().slice(0, 100);
  const rows = await all(`SELECT * FROM subscribers ${q ? "WHERE email LIKE ? OR first_name LIKE ?" : ""} ORDER BY created_at DESC LIMIT 500`, q ? [`%${q}%`, `%${q}%`] : []);
  const t = await one("SELECT SUM(status='subscribed') AS active, SUM(status='unsubscribed') AS gone, COUNT(*) AS total FROM subscribers");
  const bySource = await all("SELECT COALESCE(source,'website') AS source, COUNT(*) AS n FROM subscribers GROUP BY source ORDER BY n DESC");
  return `<div class="head"><div><h1>Waitlist</h1><div class="status" style="margin-top:.6rem"><span>Active <b>${n(t.active)}</b></span><span>Unsubscribed <b>${n(t.gone)}</b></span>${bySource.map((s) => `<span>${esc(s.source)} <b>${n(s.n)}</b></span>`).join("")}</div></div>
<div class="tools"><form class="tools" style="margin:0" method="get" action="/admin"><input type="hidden" name="tab" value="subscribers"><label class="sr" for="q">Search</label><input id="q" name="q" value="${esc(q)}" placeholder="Search email or name"><button class="btn line">Search</button></form>
<a class="btn" href="/admin/subscribers.csv">Export CSV</a></div></div>
<section class="card">${rows.length ? `<div class="scroll"><table><tr><th>Email</th><th>First name</th><th>Source</th><th>Status</th><th>Joined</th><th>Last added to bag</th></tr>
${rows.map((s) => `<tr><td>${esc(s.email)}</td><td>${esc(s.first_name || "")}</td><td>${esc(s.source || "")}</td><td><span class="pill ${esc(s.status)}">${esc(s.status)}</span></td><td>${fmtDate(s.created_at)}</td><td>${fmtDate(s.last_cart_at)}</td></tr>`).join("")}</table></div>`
  : `<p class="empty">${q ? "No one matches that search." : "No sign-ups yet. They appear here the moment someone joins on the website."}</p>`}</section>`;
}

/* ---------------- trade ---------------- */
async function trade() {
  const rows = await all("SELECT * FROM trade_leads ORDER BY created_at DESC LIMIT 500");
  return `<div class="head"><h1>Trade enquiries</h1></div><section class="card">${rows.length
    ? `<table><tr><th>Work email</th><th>Received</th></tr>${rows.map((r) => `<tr><td>${esc(r.email)}</td><td>${fmtDate(r.created_at)}</td></tr>`).join("")}</table>`
    : `<p class="empty">No trade enquiries yet.</p>`}</section>`;
}

/* ---------------- emails ---------------- */
async function emails(params, cfg) {
  const rows = await all(`SELECT flow, template, SUM(sent_at IS NOT NULL) AS sent, SUM(sent_at IS NULL AND cancelled_at IS NULL) AS pending,
    SUM(cancelled_at IS NOT NULL) AS cancelled, SUM(error IS NOT NULL AND sent_at IS NULL) AS failing FROM email_jobs GROUP BY flow, template`);
  const map = new Map(rows.map((r) => [r.template, r]));
  const next = await all("SELECT email, template, send_at FROM email_jobs WHERE sent_at IS NULL AND cancelled_at IS NULL ORDER BY send_at LIMIT 8");
  const names = { waitlist: "Waitlist series", basket: "Abandoned basket", welcome: "After purchase" };
  const templates = Object.values(FLOWS).flat().map((s) => s.template).concat(["waitlist-4-launch"]);
  return `<div class="head"><div><h1>Emails</h1><div class="status" style="margin-top:.6rem">
<span>Sending: <b>${cfg.smtp ? "Live (SMTP connected)" : "Saved to outbox (no SMTP yet)"}</b></span><span>Checkout: <b>${cfg.stripe ? "Stripe connected" : "Not connected"}</b></span></div></div></div>
${params.get("sent") ? `<p class="card" role="status">Test email ${cfg.smtp ? "sent" : "saved to the outbox"}.</p>` : ""}
<section class="grid3">${Object.entries(FLOWS).map(([flow, steps]) => `<div class="card"><h2>${names[flow]}</h2><table><tr><th>Email</th><th class="num">Sent</th><th class="num">Queued</th></tr>
${steps.map((s) => { const r = map.get(s.template) || {}; return `<tr><td>${esc(s.template)}<br><span class="note">${s.after ? Math.round(s.after / 3600e3) >= 24 ? "Day " + Math.round(s.after / 86400e3) : Math.round(s.after / 3600e3) + " h after" : "Immediately"}${Number(r.failing) ? ` · <span class="down">${n(r.failing)} failing</span>` : ""}</span></td><td class="num">${n(r.sent)}</td><td class="num">${n(r.pending)}</td></tr>`; }).join("")}</table></div>`).join("")}</section>
<section class="grid2">
  <div class="card"><h2>Next scheduled</h2>${next.length ? `<table><tr><th>To</th><th>Email</th><th>Due</th></tr>${next.map((j) => `<tr><td>${esc(j.email)}</td><td>${esc(j.template)}</td><td>${fmtDate(j.send_at)}</td></tr>`).join("")}</table>` : `<p class="empty">Nothing queued.</p>`}</div>
  <div class="card"><h2>Send a test</h2><form method="post" action="/admin/test-email" style="display:grid;gap:.7rem">
    <label class="sr" for="te">Send to</label><input id="te" name="email" type="email" placeholder="Your email" required>
    <label class="sr" for="tt">Template</label><select id="tt" name="template">${templates.map((t) => `<option>${esc(t)}</option>`).join("")}</select>
    <button class="btn">Send test email</button></form><p class="note" style="margin-top:.8rem"><a href="/emails/" target="_blank" rel="noopener">Preview every email →</a></p></div>
</section>`;
}

export async function renderAdmin(params, cfg) {
  const tab = params.get("tab") || "overview";
  const body = tab === "orders" ? await orders(params) : tab === "subscribers" ? await subscribers(params)
    : tab === "customers" ? await customersPage(params) : tab === "customer" ? await customerPage(params) : tab === "stock" ? await stockPage(params)
    : tab === "trade" ? await trade() : tab === "emails" ? await emails(params, cfg) : await overview(params);
  return shell({ orders: "Orders", customers: "Customers", customer: "Customer", stock: "Stock", subscribers: "Waitlist", trade: "Trade", emails: "Emails" }[tab] || "Overview", tab, body);
}

/* ---------------- CSV ---------------- */
const csvCell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const iso = (ms) => (ms ? new Date(Number(ms)).toISOString() : "");
export async function subscribersCsv() {
  const rows = await all("SELECT * FROM subscribers ORDER BY created_at");
  return ["email,first_name,source,status,joined,unsubscribed"].concat(rows.map((r) => [r.email, r.first_name, r.source, r.status, iso(r.created_at), iso(r.unsubscribed_at)].map(csvCell).join(","))).join("\n");
}
export async function ordersCsv() {
  const rows = await all("SELECT * FROM orders ORDER BY created_at");
  return ["order,date,email,name,plan,qty,total_gbp,status,tracking,dispatched"].concat(rows.map((r) => [1000 + Number(r.id), iso(r.created_at), r.email, r.name, r.plan, r.qty, (Number(r.amount_pence) / 100).toFixed(2), r.status, r.tracking, iso(r.dispatched_at)].map(csvCell).join(","))).join("\n");
}
