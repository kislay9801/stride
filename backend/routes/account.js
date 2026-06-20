import { Router } from 'express';
import db from '../db/database.js';
import { isAuthEnabled } from '../services/firebase.js';

const router = Router();

// GET /api/me — current user profile + whether auth is enabled.
router.get('/me', (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar_url, cognitive_load FROM users WHERE id = ?').get(req.userId);
  res.json({ user, authEnabled: isAuthEnabled() });
});

// PATCH /api/me — update editable profile fields (currently display name).
router.patch('/me', (req, res) => {
  const { name } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  db.prepare('UPDATE users SET name = COALESCE(?, name) WHERE id = ?').run(name?.trim() ?? null, req.userId);
  res.json(db.prepare('SELECT id, name, email, avatar_url, cognitive_load FROM users WHERE id = ?').get(req.userId));
});

// GET /api/search?q= — search the user's tasks, notebooks, and assignments.
router.get('/search', (req, res) => {
  const term = String(req.query.q || '').trim();
  if (!term) return res.json({ tasks: [], notebooks: [], assignments: [] });
  const like = `%${term}%`;

  const tasks = db
    .prepare("SELECT id, title, status, assignment_id FROM tasks WHERE user_id = ? AND title LIKE ? ORDER BY id DESC LIMIT 6")
    .all(req.userId, like);
  const notebooks = db
    .prepare('SELECT id, title FROM notebooks WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT 6')
    .all(req.userId, like, like);
  const assignments = db
    .prepare('SELECT id, title FROM assignments WHERE user_id = ? AND title LIKE ? LIMIT 6')
    .all(req.userId, like);

  res.json({ tasks, notebooks, assignments });
});

export default router;
