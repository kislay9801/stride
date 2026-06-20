// Auth middleware: resolves req.userId for every API request.
//
// - Demo mode (no Firebase configured): always the seeded demo user (id 1).
// - Auth mode: requires a valid Firebase ID token. New accounts are provisioned
//   lazily with a CLEAN slate (no fake stats), keyed by their Firebase UID.
import db from '../db/database.js';
import { isAuthEnabled, verifyIdToken } from './firebase.js';

const DEMO_USER_ID = 1;

function provisionUser(decoded) {
  const existing = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(decoded.uid);
  if (existing) return existing.id;

  const name = decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'Student');
  const create = db.transaction(() => {
    const id = db
      .prepare('INSERT INTO users (name, email, firebase_uid, avatar_url, cognitive_load, ai_insight) VALUES (?, ?, ?, ?, 50, NULL)')
      .run(name, decoded.email || null, decoded.uid, decoded.picture || null).lastInsertRowid;

    // Seed only an empty week scaffold so the chart axis renders — no fake hours.
    const insFocus = db.prepare('INSERT INTO daily_focus (user_id, weekday, day_index, hours) VALUES (?, ?, ?, 0)');
    [['M', 0], ['T', 1], ['W', 2], ['T', 3], ['F', 4], ['S', 5], ['S', 6]].forEach(([w, i]) => insFocus.run(id, w, i));
    return id;
  });
  return create();
}

let warnedHalfConfigured = false;

export async function authMiddleware(req, res, next) {
  if (!isAuthEnabled()) {
    // Frontend has Firebase but backend has no service account → tokens arrive
    // but can't be verified, so everyone falls back to the shared demo user.
    if (!warnedHalfConfigured && (req.headers.authorization || '').startsWith('Bearer ')) {
      warnedHalfConfigured = true;
      console.warn(
        '\n  ⚠ A signed-in request arrived but the backend has no Firebase service account.\n' +
        '    All accounts will share the demo user until you add serviceAccountKey.json\n' +
        '    (or FIREBASE_* env vars). See README → "Enabling login".\n'
      );
    }
    req.userId = DEMO_USER_ID;
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = await verifyIdToken(token);
    req.userId = provisionUser(decoded);
    req.authUser = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}
