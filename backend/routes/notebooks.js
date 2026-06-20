import { Router } from 'express';
import { get, all, run } from '../db/database.js';
import { generateJSON, GeminiError } from '../services/gemini.js';

const router = Router();

async function hydrate(notebook) {
  const quizzes = await all('SELECT id, title, description, duration_min, questions FROM quizzes WHERE notebook_id = ?', [notebook.id]);
  return {
    ...notebook,
    tags: JSON.parse(notebook.tags || '[]'),
    flashcards: await all('SELECT id, label, front, back FROM flashcards WHERE notebook_id = ?', [notebook.id]),
    quizzes: quizzes.map((q) => ({ ...q, questions: JSON.parse(q.questions || '[]') })),
    summaries: await all('SELECT id, title, body, read_time FROM summaries WHERE notebook_id = ?', [notebook.id]),
  };
}

// GET /api/notebooks — list (with materials) + mastery for the sidebar.
router.get('/', async (req, res) => {
  const notebooks = await all('SELECT * FROM notebooks WHERE user_id = ? ORDER BY updated_at DESC', [req.userId]);
  const mastery = await all('SELECT subject, percent FROM mastery WHERE user_id = ?', [req.userId]);
  res.json({ notebooks: await Promise.all(notebooks.map(hydrate)), mastery });
});

// GET /api/notebooks/:id
router.get('/:id', async (req, res) => {
  const nb = await get('SELECT * FROM notebooks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  res.json(await hydrate(nb));
});

// POST /api/notebooks — create a new notebook.
router.post('/', async (req, res) => {
  const { title, content, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const info = await run(
    'INSERT INTO notebooks (user_id, title, content, tags) VALUES (?, ?, ?, ?)',
    [req.userId, title, content ?? '', JSON.stringify(Array.isArray(tags) ? tags : [])]
  );
  res.status(201).json(await hydrate(await get('SELECT * FROM notebooks WHERE id = ?', [info.lastInsertRowid])));
});

// PATCH /api/notebooks/:id — update title/content/tags.
router.patch('/:id', async (req, res) => {
  const nb = await get('SELECT * FROM notebooks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  const { title, content, tags } = req.body;
  await run(
    `UPDATE notebooks SET title = COALESCE(?, title), content = COALESCE(?, content),
     tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ?`,
    [title ?? null, content ?? null, tags !== undefined ? JSON.stringify(tags) : null, nb.id]
  );
  res.json(await hydrate(await get('SELECT * FROM notebooks WHERE id = ?', [nb.id])));
});

// POST /api/notebooks/:id/flashcards — manually add a card.
router.post('/:id/flashcards', async (req, res) => {
  const nb = await get('SELECT id FROM notebooks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  const { front, back, label } = req.body;
  if (!front || !back) return res.status(400).json({ error: 'front and back are required' });
  const info = await run('INSERT INTO flashcards (notebook_id, label, front, back) VALUES (?, ?, ?, ?)',
    [nb.id, label ?? 'Concept', front, back]);
  res.status(201).json(await get('SELECT id, label, front, back FROM flashcards WHERE id = ?', [info.lastInsertRowid]));
});

// POST /api/notebooks/:id/generate { type: flashcards|quizzes|summaries }
router.post('/:id/generate', async (req, res) => {
  const nb = await get('SELECT * FROM notebooks WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });

  const type = req.body.type;
  const source = `${nb.title}\n\n${nb.content || ''}`.slice(0, 8000);

  try {
    if (type === 'flashcards') {
      const data = await generateJSON(
        `From these study notes, create 4 concise flashcards. Return STRICT JSON: ` +
        `{"cards":[{"label":string,"front":string,"back":string}]}. ` +
        `"label" is a 1-2 word category (e.g. "Concept", "Definition"), "front" is a term/question, "back" is the answer. Notes:\n"""${source}"""`,
        { temperature: 0.5 }
      );
      const made = [];
      for (const c of data.cards || []) {
        const info = await run('INSERT INTO flashcards (notebook_id, label, front, back) VALUES (?, ?, ?, ?)', [nb.id, c.label || 'Concept', c.front, c.back]);
        made.push({ id: info.lastInsertRowid, label: c.label, front: c.front, back: c.back });
      }
      return res.status(201).json({ flashcards: made });
    }

    if (type === 'quizzes') {
      const data = await generateJSON(
        `From these study notes, create one multiple-choice quiz with 4-6 questions. Return STRICT JSON: ` +
        `{"title":string,"description":string,"durationMin":number,` +
        `"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":number,"explanation":string}]}. Notes:\n"""${source}"""`,
        { temperature: 0.5 }
      );
      const info = await run('INSERT INTO quizzes (notebook_id, title, description, duration_min, questions) VALUES (?, ?, ?, ?, ?)',
        [nb.id, data.title || 'Quiz', data.description || '', Number(data.durationMin) || 10, JSON.stringify(data.questions || [])]);
      const row = await get('SELECT id, title, description, duration_min, questions FROM quizzes WHERE id = ?', [info.lastInsertRowid]);
      return res.status(201).json({ quiz: { ...row, questions: JSON.parse(row.questions) } });
    }

    if (type === 'summaries') {
      const data = await generateJSON(
        `From these study notes, create 2 summaries. Return STRICT JSON: ` +
        `{"summaries":[{"title":string,"body":string,"readTime":string}]}. ` +
        `"body" is 2-4 sentences, "readTime" like "3 min read". Notes:\n"""${source}"""`,
        { temperature: 0.5 }
      );
      const made = [];
      for (const s of data.summaries || []) {
        const info = await run('INSERT INTO summaries (notebook_id, title, body, read_time) VALUES (?, ?, ?, ?)', [nb.id, s.title, s.body, s.readTime || '3 min read']);
        made.push({ id: info.lastInsertRowid, title: s.title, body: s.body, read_time: s.readTime || '3 min read' });
      }
      return res.status(201).json({ summaries: made });
    }

    return res.status(400).json({ error: 'type must be flashcards, quizzes, or summaries' });
  } catch (e) {
    if (e instanceof GeminiError) return res.status(503).json({ error: e.message });
    throw e;
  }
});

export default router;
