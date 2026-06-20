import { Router } from 'express';
import { all } from '../db/database.js';
import { chat, GeminiError } from '../services/gemini.js';

const router = Router();

const SYSTEM = `You are Stride's AI Tutor — a calm, encouraging study companion for a student.
Explain concepts clearly and concisely, use simple analogies, and ask a short follow-up question
to check understanding when helpful. Keep answers focused; avoid overwhelming walls of text.`;

// POST /api/tutor/chat { messages: [{role:'user'|'model', text}] }
router.post('/chat', async (req, res) => {
  const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
  if (messages.length === 0) return res.status(400).json({ error: 'messages array is required' });

  // Give the tutor light context about what the student is studying.
  const subjects = await all('SELECT subject, percent FROM mastery WHERE user_id = ?', [req.userId]);
  const context = subjects.length
    ? `\nFor context, the student is currently studying: ${subjects.map((s) => `${s.subject} (${s.percent}% mastery)`).join(', ')}.`
    : '';

  try {
    const reply = await chat(messages, SYSTEM + context);
    res.json({ reply });
  } catch (e) {
    if (e instanceof GeminiError) return res.status(503).json({ error: e.message });
    throw e;
  }
});

export default router;
