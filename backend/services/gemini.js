// Thin wrapper around the Google Gemini REST API (no SDK dependency).
// Docs: https://ai.google.dev/api/generate-content

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

class GeminiError extends Error {}
export { GeminiError };

// Turns a raw Gemini HTTP error into a short, user-facing message.
function formatHttpError(status, detail) {
  if (status === 429) return 'Gemini rate limit / quota reached. Check your plan & billing, or try again shortly.';
  if (status === 400 && /API key not valid/i.test(detail)) return 'Your Gemini API key is invalid. Check GEMINI_API_KEY in your .env.';
  if (status === 403) return 'Gemini denied the request (key permissions or API not enabled for this project).';
  if (status === 404) return `Gemini model "${MODEL}" was not found. Set a valid GEMINI_MODEL in your .env.`;
  if (status >= 500) return 'Gemini is temporarily unavailable. Please try again in a moment.';
  return `Gemini API error (${status}): ${detail.slice(0, 200)}`;
}

/**
 * Low-level call. Returns the model's raw text output.
 * @param {string} prompt
 * @param {object} [opts]
 * @param {string} [opts.system] system instruction
 * @param {boolean} [opts.json] ask the model to return JSON (response_mime_type)
 */
export async function generate(prompt, opts = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      'Gemini API key not configured. Add GEMINI_API_KEY to your .env file (see .env.example).'
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new GeminiError(`Could not reach Gemini API: ${e.message}`);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(formatHttpError(res.status, detail));
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  if (!text) throw new GeminiError('Gemini returned an empty response.');
  return text;
}

/**
 * Calls generate() asking for JSON and parses it. Strips ```json fences if present.
 */
export async function generateJSON(prompt, opts = {}) {
  const raw = await generate(prompt, { ...opts, json: true });
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last-ditch: pull the first {...} or [...] block out of the text.
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new GeminiError('Could not parse JSON from Gemini response.');
  }
}

/** Multi-turn chat for the AI Tutor. messages: [{role:'user'|'model', text}] */
export async function chat(messages, system) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError(
      'Gemini API key not configured. Add GEMINI_API_KEY to your .env file (see .env.example).'
    );
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const body = {
    contents: messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    })),
    generationConfig: { temperature: 0.8 },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(formatHttpError(res.status, detail));
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  return text || 'Sorry, I could not generate a response just now.';
}
