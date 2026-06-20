import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, 'stride.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Apply schema (idempotent — all statements use IF NOT EXISTS).
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Lightweight migration: add auth columns to pre-existing databases where the
// users table was created before these columns existed.
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('email')) db.exec('ALTER TABLE users ADD COLUMN email TEXT');
if (!userCols.includes('firebase_uid')) db.exec('ALTER TABLE users ADD COLUMN firebase_uid TEXT');

// Column is now guaranteed to exist (fresh or migrated) — create the unique index.
// One row per Firebase account; multiple NULLs (demo user) are allowed.
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid) WHERE firebase_uid IS NOT NULL');

export default db;
