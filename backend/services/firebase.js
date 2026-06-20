// Firebase Admin initialization for verifying client ID tokens.
// Auth is OPTIONAL: if no credentials are configured the app runs in demo mode
// (single seeded user). The moment you provide a service account, auth turns on.
//
// Configure either:
//   1. a serviceAccountKey.json file in the project root, OR
//   2. env vars FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');

let authEnabled = false;

function init() {
  if (getApps().length) return;

  const saPath = join(root, 'serviceAccountKey.json');
  try {
    if (existsSync(saPath)) {
      const sa = JSON.parse(readFileSync(saPath, 'utf-8'));
      initializeApp({ credential: cert(sa) });
      authEnabled = true;
      console.log('Firebase Admin: using serviceAccountKey.json');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Env vars escape newlines; restore them.
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      authEnabled = true;
      console.log('Firebase Admin: using env credentials');
    }
  } catch (e) {
    console.error('Firebase Admin init failed — falling back to demo mode:', e.message);
    authEnabled = false;
  }
}

init();

export function isAuthEnabled() {
  return authEnabled;
}

export function verifyIdToken(token) {
  return getAuth().verifyIdToken(token);
}
