import { Router } from 'express';
import { get, all, run } from '../db/database.js';
import { generate, GeminiError } from '../services/gemini.js';

const router = Router();

// Cognitive load is derived from the user's real workload, so it changes as they
// add and complete tasks (rather than being a fixed number). Higher = busier.
async function computeCognitiveLoad(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = await all('SELECT status FROM tasks WHERE user_id = ? AND date = ?', [userId, today]);
  const pendingToday = todayTasks.filter((t) => t.status !== 'done').length;
  const doneToday = todayTasks.filter((t) => t.status === 'done').length;
  const assignRow = await get(
    "SELECT COUNT(*) AS c FROM tasks WHERE user_id = ? AND assignment_id IS NOT NULL AND status != 'done'",
    [userId]
  );
  const assignmentPending = assignRow?.c || 0;

  // Weighted: pending work raises load, finishing work lowers it.
  let load = 20 + pendingToday * 15 + assignmentPending * 6 - doneToday * 8;
  return Math.max(10, Math.min(95, Math.round(load)));
}

function timeOfDay(h) {
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// GET /api/dashboard — everything the dashboard page needs in one payload.
router.get('/', async (req, res) => {
  const user = await get('SELECT id, name, avatar_url, cognitive_load, ai_insight FROM users WHERE id = ?', [req.userId]);
  user.cognitive_load = await computeCognitiveLoad(req.userId);

  const today = new Date().toISOString().slice(0, 10);
  const timeline = await all(
    `SELECT id, title, description, icon, status, start_time, end_time
     FROM tasks WHERE user_id = ? AND date = ? ORDER BY sort_order`,
    [req.userId, today]
  );

  const weekly = await all(
    'SELECT weekday, day_index, hours FROM daily_focus WHERE user_id = ? ORDER BY day_index',
    [req.userId]
  );

  const comingUp = await all(
    `SELECT t.id, t.title, t.due_date, t.icon, a.title AS assignment
     FROM tasks t LEFT JOIN assignments a ON a.id = t.assignment_id
     WHERE t.user_id = ? AND t.assignment_id IS NOT NULL AND t.status != 'done'
     ORDER BY t.sort_order LIMIT 4`,
    [req.userId]
  );

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

// Rotating themes so regenerated insights feel fresh rather than repetitive.
const INSIGHT_ANGLES = [
  'active recall', 'spaced repetition', 'time-blocking your day',
  'taking strategic breaks', 'prioritizing by deadline', 'tackling the hardest task first',
  'reviewing your weakest subject', 'building momentum with a quick win',
  'reducing context-switching', 'reflecting on what you learned today',
];

let lastAngle = null;

// POST /api/dashboard/insight — regenerate a varied AI insight via Gemini.
router.post('/insight', async (req, res) => {
  const user = await get('SELECT name FROM users WHERE id = ?', [req.userId]);
  const load = await computeCognitiveLoad(req.userId);
  const mastery = await all('SELECT subject, percent FROM mastery WHERE user_id = ?', [req.userId]);
  const today = new Date().toISOString().slice(0, 10);
  const pending = await all(
    "SELECT title FROM tasks WHERE user_id = ? AND status != 'done' AND (date = ? OR assignment_id IS NOT NULL) LIMIT 5",
    [req.userId, today]
  );

  // Pick an angle different from the previous one so insights don't repeat.
  let angle;
  do {
    angle = INSIGHT_ANGLES[Math.floor(Math.random() * INSIGHT_ANGLES.length)];
  } while (angle === lastAngle && INSIGHT_ANGLES.length > 1);
  lastAngle = angle;
  const prompt =
    `You are a study coach for ${user.name}. It is ${timeOfDay(new Date().getHours())}. ` +
    `Their current cognitive load is ${load}%. ` +
    `Pending tasks: ${pending.map((p) => p.title).join('; ') || 'none right now'}. ` +
    `Subject mastery: ${mastery.map((m) => `${m.subject} ${m.percent}%`).join(', ') || 'not tracked yet'}. ` +
    `Write ONE short, specific, encouraging study insight (max 2 sentences) themed around "${angle}". ` +
    `Make it feel fresh and tailored — reference their actual situation. No markdown, no quotes.`;

  try {
    const insight = (await generate(prompt, { temperature: 1.0 })).trim();
    await run('UPDATE users SET ai_insight = ? WHERE id = ?', [insight, req.userId]);
    res.json({ insight });
  } catch (e) {
    if (e instanceof GeminiError) return res.status(503).json({ error: e.message });
    throw e;
  }
});

export default router;
