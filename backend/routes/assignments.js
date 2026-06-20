import { Router } from 'express';
import multer from 'multer';
import db from '../db/database.js';
import { generateJSON, GeminiError } from '../services/gemini.js';
import { recomputeAssignmentProgress } from './tasks.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function withProgress(assignment) {
  const tasks = db
    .prepare('SELECT id, title, description, status, estimate_hours, spent_hours, due_date, sort_order FROM tasks WHERE assignment_id = ? ORDER BY sort_order')
    .all(assignment.id);
  return { ...assignment, progress: recomputeAssignmentProgress(assignment.id), tasks };
}

// GET /api/assignments — list with their roadmap tasks.
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM assignments WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(withProgress));
});

// GET /api/assignments/:id
router.get('/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM assignments WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });
  res.json(withProgress(a));
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
  const save = db.transaction(() => {
    const assignmentId = db
      .prepare('INSERT INTO assignments (user_id, title, primary_goal, estimated_effort_hours) VALUES (?, ?, ?, ?)')
      .run(req.userId, finalTitle, plan.primaryGoal ?? '', Number(plan.estimatedEffortHours) || 0).lastInsertRowid;

    const ins = db.prepare(
      `INSERT INTO tasks (user_id, assignment_id, title, description, status, estimate_hours, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    (plan.tasks || []).forEach((t, i) => {
      ins.run(req.userId, assignmentId, t.title || `Step ${i + 1}`, t.description || '', i === 0 ? 'active' : 'upcoming', Number(t.estimateHours) || 0, t.dueDate || null, i);
    });
    return assignmentId;
  });

  const id = save();
  res.status(201).json(withProgress(db.prepare('SELECT * FROM assignments WHERE id = ?').get(id)));
});

// DELETE /api/assignments/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM assignments WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (!info.changes) return res.status(404).json({ error: 'Assignment not found' });
  res.status(204).end();
});

export default router;
