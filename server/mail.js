// Email: renders the templates in /emails, sends through SMTP when configured, otherwise saves to the outbox folder.
// Sequences (waitlist, abandoned basket, post-purchase) are queued in email_jobs and sent by the scheduler.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { one, all, run } from "./db.js";

const ROOT = new URL("..", import.meta.url).pathname;
const OUTBOX = process.env.OUTBOX_DIR || join(ROOT, "data", "outbox");
const FROM = process.env.MAIL_FROM || "Jamivia <hello@jamivia.co.uk>";
const SITE_URL = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const H = 3600e3, D = 24 * H;

// Which emails each flow sends, and when (relative to the trigger).
export const FLOWS = {
  waitlist: [
    { template: "waitlist-1-welcome", after: 0 },
    { template: "waitlist-2-story", after: 3 * D },
    { template: "waitlist-3-formula", after: 7 * D },
  ],
  basket: [
    { template: "basket-1-reminder", after: 1 * H },
    { template: "basket-2-questions", after: 24 * H },
    { template: "basket-3-founder", after: 72 * H },
  ],
  welcome: [
    { template: "welcome-1-how-to-start", after: 1 * D },
    { template: "welcome-2-full-scoop", after: 7 * D },
    { template: "welcome-3-reorder", after: 21 * D, oneTimeOnly: true },
  ],
};

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const cache = new Map();
function template(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("bad template name");
  if (!cache.has(name)) cache.set(name, readFileSync(join(ROOT, "emails", name + ".html"), "utf8"));
  return cache.get(name);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function render(name, { firstName, token, itemPrice } = {}) {
  const unsub = token ? `${SITE_URL}/unsubscribe?t=${encodeURIComponent(token)}` : `${SITE_URL}/unsubscribe`;
  let html = template(name)
    .replaceAll("{{ first_name|default:'there' }}", esc(firstName || "there"))
    .replaceAll("{% unsubscribe_url %}", unsub)
    .replaceAll("{% manage_preferences_url %}", unsub)
    .replaceAll("{{ event.ItemPrice|default:'' }}", itemPrice ? esc(itemPrice) : "")
    .replaceAll("https://barcoleonfx-hub.github.io/jamivia/", SITE_URL + "/");
  const subject = (html.match(/<title>([^<]*)<\/title>/) || [, "Jamivia"])[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'");
  return { subject, html, unsub };
}

export async function send(to, name, vars) {
  const { subject, html, unsub } = render(name, vars);
  const msg = { from: FROM, to, subject, html, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
  if (transport) return transport.sendMail(msg);
  mkdirSync(OUTBOX, { recursive: true });
  const file = join(OUTBOX, `${Date.now()}-${name}-${to.replace(/[^a-z0-9@.]/gi, "_")}.html`);
  writeFileSync(file, `<!-- To: ${esc(to)} | Subject: ${esc(subject)} -->\n` + html);
  return { saved: file };
}

export async function queue(email, flow, from = Date.now(), meta = {}) {
  for (const step of FLOWS[flow]) {
    if (step.oneTimeOnly && meta.plan === "sub") continue;
    await run("INSERT INTO email_jobs (email, flow, template, send_at, meta) VALUES (?,?,?,?,?)",
      [email, flow, step.template, from + step.after, JSON.stringify(meta)]);
  }
}

export async function cancel(email, flow) {
  await run("UPDATE email_jobs SET cancelled_at=? WHERE email=? AND flow=? AND sent_at IS NULL AND cancelled_at IS NULL",
    [Date.now(), email, flow]);
}

export async function hasPending(email, flow) {
  return !!(await one("SELECT 1 FROM email_jobs WHERE email=? AND flow=? AND sent_at IS NULL AND cancelled_at IS NULL LIMIT 1", [email, flow]));
}

let running = false;
export async function processDue() {
  if (running) return 0;
  running = true;
  let sent = 0;
  try {
    const jobs = await all(
      "SELECT * FROM email_jobs WHERE sent_at IS NULL AND cancelled_at IS NULL AND send_at <= ? ORDER BY send_at LIMIT 50", [Date.now()]);
    for (const job of jobs) {
      const sub = await one("SELECT * FROM subscribers WHERE email=?", [job.email]);
      // Marketing flows need an active subscription. Post-purchase emails go to customers unless they unsubscribed.
      if ((sub && sub.status !== "subscribed") || (!sub && job.flow !== "welcome")) {
        await run("UPDATE email_jobs SET cancelled_at=? WHERE id=?", [Date.now(), job.id]);
        continue;
      }
      try {
        const meta = JSON.parse(job.meta || "{}");
        await send(job.email, job.template, { firstName: sub?.first_name || meta.firstName, token: sub?.token, itemPrice: meta.itemPrice });
        await run("UPDATE email_jobs SET sent_at=?, error=NULL WHERE id=?", [Date.now(), job.id]);
        sent++;
      } catch (e) {
        await run("UPDATE email_jobs SET error=? WHERE id=?", [String(e.message || e).slice(0, 300), job.id]);
      }
    }
  } finally {
    running = false;
  }
  return sent;
}
