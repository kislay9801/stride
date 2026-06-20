import { Router } from 'express';
import db from '../db/database.js';
import { generate, GeminiError } from '../services/gemini.js';

const router = Router();

// GET /api/dashboard — everything the dashboard page needs in one payload.
router.get('/', (req, res) => {
  const user = db.prepare('SELECT id, name, avatar_url, cognitive_load, ai_insight FROM users WHERE id = ?').get(req.userId);

  const today = new Date().toISOString().slice(0, 10);
  const timeline = db
    .prepare(
      `SELECT id, title, description, icon, status, start_time, end_time
       FROM tasks WHERE user_id = ? AND date = ? ORDER BY sort_order`
    )
    .all(req.userId, today);

  const weekly = db
    .prepare('SELECT weekday, day_index, hours FROM daily_focus WHERE user_id = ? ORDER BY day_index')
    .all(req.userId);

  // Coming-up = roadmap tasks that aren't done, soonest first.
  const comingUp = db
    .prepare(
      `SELECT t.id, t.title, t.due_date, t.icon, a.title AS assignment
       FROM tasks t LEFT JOIN assignments a ON a.id = t.assignment_id
       WHERE t.user_id = ? AND t.assignment_id IS NOT NULL AND t.status != 'done'
       ORDER BY t.sort_order LIMIT 4`
    )
    .all(req.userId);

  const focusHours = weekly.reduce((s, d) => s + d.hours, 0);
  const goalsMet = timeline.filter((t) => t.status === 'done').length;

  res.json({
    user,
    timeline,
    weekly,
    comingUp,
    stats: {
      focusTime: Number(focusHours.toFixed(1)),
      goalsMet,
      goalsTotal: timeline.length,
    },
  });
});

// POST /api/dashboard/insight — regenerate the AI insight via Gemini.
router.post('/insight', async (req, res) => {
  const user = db.prepare('SELECT name, cognitive_load FROM users WHERE id = ?').get(req.userId);
  const mastery = db.prepare('SELECT subject, percent FROM mastery WHERE user_id = ?').all(req.userId);
  const prompt = `The student "${user.name}" has a current cognitive capacity of ${user.cognitive_load}%. ` +
    `Their subject mastery is: ${mastery.map((m) => `${m.subject} ${m.percent}%`).join(', ')}. ` +
    `Write ONE short, encouraging, actionable study insight (max 2 sentences). ` +
    `Be specific and calm. Do not use markdown or quotes.`;
  try {
    const insight = (await generate(prompt, { temperature: 0.9 })).trim();
    db.prepare('UPDATE users SET ai_insight = ? WHERE id = ?').run(insight, req.userId);
    res.json({ insight });
  } catch (e) {
    if (e instanceof GeminiError) return res.status(503).json({ error: e.message });
    throw e;
  }
});

export default router;
