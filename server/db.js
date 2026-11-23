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
];

export async function migrate() {
  for (const sql of SCHEMA) await db.execute(sql);
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
