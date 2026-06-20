import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import db from './db/database.js';
import { seed } from './db/seed.js';
import { hasGeminiKey } from './services/gemini.js';
import { isAuthEnabled } from './services/firebase.js';
import { authMiddleware } from './services/auth.js';

import dashboardRouter from './routes/dashboard.js';
import tasksRouter from './routes/tasks.js';
import assignmentsRouter from './routes/assignments.js';
import notebooksRouter from './routes/notebooks.js';
import tutorRouter from './routes/tutor.js';
import accountRouter from './routes/account.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(__dirname, '..', 'frontend');

// In demo mode (no Firebase) auto-seed so the app is never empty.
// With auth enabled, each real account is provisioned clean on first sign-in.
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0 && !isAuthEnabled()) {
  console.log('Empty database — seeding demo data...');
  seed();
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// --- API ---
app.get('/api/health', (req, res) =>
  res.json({ ok: true, ai: hasGeminiKey() ? 'configured' : 'missing-key', authEnabled: isAuthEnabled() })
);

// Everything below requires a resolved user (real in auth mode, demo otherwise).
app.use('/api', authMiddleware);
app.use('/api', accountRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/notebooks', notebooksRouter);
app.use('/api/tutor', tutorRouter);

// JSON 404 for unmatched API routes.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler so routes can throw.
app.use('/api', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Frontend (static) ---
app.use(express.static(frontendDir));
app.get('/', (req, res) => res.sendFile(join(frontendDir, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Stride running at http://localhost:${PORT}`);
  console.log(`  Gemini AI: ${hasGeminiKey() ? 'configured ✓' : 'no key (AI features will prompt for a key)'}\n`);
});
