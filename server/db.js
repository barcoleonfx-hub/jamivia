// Database: SQLite through libsql (same as Preston Hill). On Render the file lives on the persistent disk.
import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const url = process.env.DATABASE_URL || "file:./data/jamivia.db";
if (url.startsWith("file:")) mkdirSync(dirname(url.slice(5)), { recursive: true });

export const db = createClient({ url });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS subscribers (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     first_name TEXT,
     source TEXT,
     status TEXT NOT NULL DEFAULT 'subscribed',
     token TEXT NOT NULL,
     consent_at INTEGER,
     created_at INTEGER NOT NULL,
     unsubscribed_at INTEGER,
     last_cart_at INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS trade_leads (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ts INTEGER NOT NULL,
     type TEXT NOT NULL,
     sid TEXT,
     path TEXT,
     referrer TEXT,
     utm_source TEXT,
     utm_medium TEXT,
     utm_campaign TEXT,
     device TEXT,
     value REAL
   )`,
  `CREATE INDEX IF NOT EXISTS events_ts ON events(ts)`,
  `CREATE INDEX IF NOT EXISTS events_type_ts ON events(type, ts)`,
  `CREATE TABLE IF NOT EXISTS orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     stripe_session TEXT UNIQUE,
     email TEXT,
     name TEXT,
     plan TEXT,
     qty INTEGER,
     amount_pence INTEGER,
     currency TEXT,
     status TEXT NOT NULL DEFAULT 'paid',
     tracking TEXT,
     address TEXT,
     created_at INTEGER NOT NULL,
     dispatched_at INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS email_jobs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL,
     flow TEXT NOT NULL,
     template TEXT NOT NULL,
     send_at INTEGER NOT NULL,
     sent_at INTEGER,
     cancelled_at INTEGER,
     error TEXT,
     meta TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS email_jobs_due ON email_jobs(sent_at, cancelled_at, send_at)`,
  // ---- CRM ----
  `CREATE TABLE IF NOT EXISTS customer_meta (
     email TEXT PRIMARY KEY,
     tags TEXT,
     updated_at INTEGER
   )`,
  `CREATE TABLE IF NOT EXISTS customer_notes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL,
     note TEXT NOT NULL,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS customer_notes_email ON customer_notes(email)`,
  // ---- stock and batches ----
  `CREATE TABLE IF NOT EXISTS batches (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code TEXT NOT NULL UNIQUE,
     made_on TEXT,
     best_before TEXT,
     qty_received INTEGER NOT NULL DEFAULT 0,
     received_at INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'testing',
     coa_file TEXT,
     coa_name TEXT,
     coa_uploaded_at INTEGER,
     notes TEXT
   )`,
  `CREATE TABLE IF NOT EXISTS stock_moves (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     batch_id INTEGER NOT NULL,
     delta INTEGER NOT NULL,
     reason TEXT NOT NULL,
     order_id INTEGER,
     note TEXT,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS stock_moves_batch ON stock_moves(batch_id)`,
  `CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY,
     value TEXT
   )`,
];

// Columns added after launch: added once, ignored if they already exist.
const COLUMNS = [
  ["orders", "batch_id", "INTEGER"],
  ["orders", "stripe_customer", "TEXT"],
  ["orders", "stripe_subscription", "TEXT"],
  ["orders", "sub_ended_at", "INTEGER"],
  ["orders", "refunded_at", "INTEGER"],
];

export async function migrate() {
  for (const sql of SCHEMA) await db.execute(sql);
  for (const [table, col, type] of COLUMNS) {
    const cols = (await db.execute(`PRAGMA table_info(${table})`)).rows.map((r) => r.name);
    if (!cols.includes(col)) await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

export async function setting(key, fallback) {
  const r = await one("SELECT value FROM settings WHERE key=?", [key]);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  await run("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [key, String(value)]);
}

export async function one(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows[0] || null;
}

export async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows;
}

export async function run(sql, args = []) {
  return db.execute({ sql, args });
}
