import { Router } from 'express';
import { get, all, run } from '../db/database.js';

const router = Router();
const STATUSES = ['done', 'active', 'upcoming'];

// PATCH /api/tasks/:id — update status, hours, or editable fields.
router.patch('/:id', async (req, res) => {
  const task = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status, spent_hours, title, description, estimate_hours, due_date, icon, start_time, end_time } = req.body;
  if (status !== undefined && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
  }
  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  await run(
    `UPDATE tasks SET
       status = COALESCE(?, status),
       spent_hours = COALESCE(?, spent_hours),
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       estimate_hours = COALESCE(?, estimate_hours),
       due_date = COALESCE(?, due_date),
       icon = COALESCE(?, icon),
       start_time = COALESCE(?, start_time),
       end_time = COALESCE(?, end_time)
     WHERE id = ?`,
    [status ?? null, spent_hours ?? null, title?.trim() ?? null, description ?? null,
     estimate_hours ?? null, due_date ?? null, icon ?? null, start_time ?? null, end_time ?? null, task.id]
  );

  res.json(await get('SELECT * FROM tasks WHERE id = ?', [task.id]));
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const task = await get('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  await run('DELETE FROM tasks WHERE id = ?', [task.id]);
  res.status(204).end();
});

// POST /api/tasks — create a standalone timeline task.
router.post('/', async (req, res) => {
  const { title, description, start_time, end_time, icon } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const today = new Date().toISOString().slice(0, 10);
  const max = await get('SELECT MAX(sort_order) m FROM tasks WHERE user_id = ? AND date = ?', [req.userId, today]);
  const sort = (max?.m ?? -1) + 1;
  const info = await run(
    `INSERT INTO tasks (user_id, title, description, icon, status, date, start_time, end_time, sort_order)
     VALUES (?, ?, ?, ?, 'upcoming', ?, ?, ?, ?)`,
    [req.userId, title, description ?? '', icon ?? 'task_alt', today, start_time ?? null, end_time ?? null, sort]
  );
  res.status(201).json(await get('SELECT * FROM tasks WHERE id = ?', [info.lastInsertRowid]));
});

// Computes an assignment's completion percentage from its tasks.
export async function recomputeAssignmentProgress(assignmentId) {
  const rows = await all('SELECT status FROM tasks WHERE assignment_id = ?', [assignmentId]);
  if (rows.length === 0) return 0;
  const done = rows.filter((r) => r.status === 'done').length;
  return Math.round((done / rows.length) * 100);
}

export default router;
