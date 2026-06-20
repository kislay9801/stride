import { Router } from 'express';
import { get, all, run } from '../db/database.js';
import { isAuthEnabled } from '../services/firebase.js';

const router = Router();

// GET /api/me — current user profile + whether auth is enabled.
router.get('/me', async (req, res) => {
  const user = await get('SELECT id, name, email, avatar_url, cognitive_load FROM users WHERE id = ?', [req.userId]);
  res.json({ user, authEnabled: isAuthEnabled() });
});

// PATCH /api/me — update editable profile fields (currently display name).
router.patch('/me', async (req, res) => {
  const { name } = req.body;
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  await run('UPDATE users SET name = COALESCE(?, name) WHERE id = ?', [name?.trim() ?? null, req.userId]);
  res.json(await get('SELECT id, name, email, avatar_url, cognitive_load FROM users WHERE id = ?', [req.userId]));
});

// GET /api/search?q= — search the user's tasks, notebooks, and assignments.
router.get('/search', async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (!term) return res.json({ tasks: [], notebooks: [], assignments: [] });
  const like = `%${term}%`;

  const tasks = await all('SELECT id, title, status, assignment_id FROM tasks WHERE user_id = ? AND title LIKE ? ORDER BY id DESC LIMIT 6', [req.userId, like]);
  const notebooks = await all('SELECT id, title FROM notebooks WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) LIMIT 6', [req.userId, like, like]);
  const assignments = await all('SELECT id, title FROM assignments WHERE user_id = ? AND title LIKE ? LIMIT 6', [req.userId, like]);

  res.json({ tasks, notebooks, assignments });
});

export default router;
