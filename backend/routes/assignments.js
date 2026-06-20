import { Router } from 'express';
import multer from 'multer';
import { get, all, run } from '../db/database.js';
import { generateJSON, GeminiError } from '../services/gemini.js';
import { recomputeAssignmentProgress } from './tasks.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function withProgress(assignment) {
  const tasks = await all(
    'SELECT id, title, description, status, estimate_hours, spent_hours, due_date, sort_order FROM tasks WHERE assignment_id = ? ORDER BY sort_order',
    [assignment.id]
  );
  return { ...assignment, progress: await recomputeAssignmentProgress(assignment.id), tasks };
}

// GET /api/assignments — list with their roadmap tasks.
router.get('/', async (req, res) => {
  const rows = await all('SELECT * FROM assignments WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(await Promise.all(rows.map(withProgress)));
});

// GET /api/assignments/:id
router.get('/:id', async (req, res) => {
  const a = await get('SELECT * FROM assignments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  res.json(await withProgress(a));
});

// POST /api/assignments/breakdown
// Accepts either multipart (field "file") or JSON { title, brief }.
// Uses Gemini to deconstruct the brief into an ordered roadmap, then persists it.
router.post('/breakdown', upload.single('file'), async (req, res) => {
  let title = req.body.title?.trim();
  let brief = req.body.brief?.trim() || '';

  if (req.file) {
    brief = `${brief}\n\n${req.file.buffer.toString('utf-8')}`.trim();
    if (!title) title = req.file.originalname.replace(/\.[^.]+$/, '');
  }

  if (!brief) return res.status(400).json({ error: 'Provide a brief (paste text or upload a file).' });

  const prompt = `You are a study coach. A student gives you an assignment brief. ` +
    `Break it into an ordered roadmap of 3-6 concrete, manageable steps. ` +
    `Return STRICT JSON of this shape:\n` +
    `{"title": string, "primaryGoal": string, "estimatedEffortHours": number, ` +
    `"tasks": [{"title": string, "description": string, "estimateHours": number, "dueDate": string}]}\n` +
    `dueDate is a short human label like "Oct 15" or "" if unknown. ` +
    `${title ? `The assignment title is "${title}". ` : ''}` +
    `Here is the brief:\n"""${brief.slice(0, 8000)}"""`;

  let plan;
  try {
    plan = await generateJSON(prompt, { temperature: 0.4 });
  } catch (e) {
    if (e instanceof GeminiError) return res.status(503).json({ error: e.message });
    throw e;
  }

  const finalTitle = title || plan.title || 'Untitled Assignment';
  const assignmentId = (
    await run(
      'INSERT INTO assignments (user_id, title, primary_goal, estimated_effort_hours) VALUES (?, ?, ?, ?)',
      [req.userId, finalTitle, plan.primaryGoal ?? '', Number(plan.estimatedEffortHours) || 0]
    )
  ).lastInsertRowid;

  const tasks = plan.tasks || [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    await run(
      `INSERT INTO tasks (user_id, assignment_id, title, description, status, estimate_hours, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, assignmentId, t.title || `Step ${i + 1}`, t.description || '', i === 0 ? 'active' : 'upcoming', Number(t.estimateHours) || 0, t.dueDate || null, i]
    );
  }

  const created = await get('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
  res.status(201).json(await withProgress(created));
});

// DELETE /api/assignments/:id (also removes its tasks)
router.delete('/:id', async (req, res) => {
  const a = await get('SELECT id FROM assignments WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  await run('DELETE FROM tasks WHERE assignment_id = ?', [a.id]);
  await run('DELETE FROM assignments WHERE id = ?', [a.id]);
  res.status(204).end();
});

export default router;
