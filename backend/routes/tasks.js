import { Router } from 'express';
import db from '../db/database.js';

const router = Router();
const STATUSES = ['done', 'active', 'upcoming'];

// PATCH /api/tasks/:id — update status and/or spent hours.
router.patch('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status, spent_hours } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
  }

  db.prepare('UPDATE tasks SET status = COALESCE(?, status), spent_hours = COALESCE(?, spent_hours) WHERE id = ?')
    .run(status ?? null, spent_hours ?? null, task.id);

  // Keep the parent assignment's progress in sync if this is a roadmap task.
  if (task.assignment_id) recomputeAssignmentProgress(task.assignment_id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id));
});

// POST /api/tasks — create a standalone timeline task.
router.post('/', (req, res) => {
  const { title, description, start_time, end_time, icon } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const today = new Date().toISOString().slice(0, 10);
  const sort = (db.prepare('SELECT MAX(sort_order) m FROM tasks WHERE user_id = ? AND date = ?').get(req.userId, today).m ?? -1) + 1;
  const info = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, icon, status, date, start_time, end_time, sort_order)
       VALUES (?, ?, ?, ?, 'upcoming', ?, ?, ?, ?)`
    )
    .run(req.userId, title, description ?? '', icon ?? 'task_alt', today, start_time ?? null, end_time ?? null, sort);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid));
});

export function recomputeAssignmentProgress(assignmentId) {
  const rows = db.prepare("SELECT status FROM tasks WHERE assignment_id = ?").all(assignmentId);
  if (rows.length === 0) return 0;
  const done = rows.filter((r) => r.status === 'done').length;
  return Math.round((done / rows.length) * 100);
}

export default router;
