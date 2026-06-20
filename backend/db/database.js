import 'dotenv/config';
import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Uses Turso (libsql://) when TURSO_DATABASE_URL is set; otherwise falls back to
// a local SQLite file so development works without any cloud setup.
function makeClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  const dataDir = process.env.STRIDE_DATA_DIR || join(__dirname, '..', '..', 'data');
  mkdirSync(dataDir, { recursive: true });
  return createClient({ url: `file:${join(dataDir, 'stride.db')}` });
}

const client = makeClient();

// libsql rejects `undefined` args — normalize them to null.
const norm = (args) => args.map((a) => (a === undefined ? null : a));
const toObj = (row, columns) => {
  const o = {};
  for (const c of columns) o[c] = row[c];
  return o;
};

export async function all(sql, args = []) {
  const r = await client.execute({ sql, args: norm(args) });
  return r.rows.map((row) => toObj(row, r.columns));
}

export async function get(sql, args = []) {
  return (await all(sql, args))[0];
}

export async function run(sql, args = []) {
  const r = await client.execute({ sql, args: norm(args) });
  return {
    lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : undefined,
    changes: r.rowsAffected,
  };
}

// Schema bootstrap + migration. Memoized so it runs once per process.
let initPromise;
export function ready() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

async function init() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await client.executeMultiple(schema);

  // Migrate pre-existing databases that lack the auth columns.
  const cols = (await all('PRAGMA table_info(users)')).map((c) => c.name);
  if (!cols.includes('email')) await client.execute('ALTER TABLE users ADD COLUMN email TEXT');
  if (!cols.includes('firebase_uid')) await client.execute('ALTER TABLE users ADD COLUMN firebase_uid TEXT');
  await client.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL'
  );
}

export { client };
