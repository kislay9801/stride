/* AI Tutor: a chat UI backed by /api/tutor/chat (Gemini). */

const messages = []; // { role: 'user' | 'model', text }

const SUGGESTIONS = [
  'Explain chiral centers simply',
  'Quiz me on functional groups',
  'Help me plan tonight’s study session',
  'Give me an analogy for SN1 vs SN2',
];

function bubble(role, text) {
  const isUser = role === 'user';
  const wrap = document.createElement('div');
  wrap.className = `flex ${isUser ? 'justify-end' : 'justify-start'} fade-in`;
  wrap.innerHTML = isUser
    ? `<div class="bg-primary text-white px-lg py-md rounded-2xl rounded-br-sm max-w-[80%] font-body-md whitespace-pre-wrap">${escapeHtml(text)}</div>`
    : `<div class="flex gap-sm max-w-[85%]">
         <div class="w-8 h-8 shrink-0 rounded-full bg-primary-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">psychology</span></div>
         <div class="bg-surface-container-low px-lg py-md rounded-2xl rounded-bl-sm font-body-md text-on-surface whitespace-pre-wrap">${escapeHtml(text)}</div>
       </div>`;
  return wrap;
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function typingIndicator() {
  const el = document.createElement('div');
  el.id = 'typing';
  el.className = 'flex gap-sm fade-in';
  el.innerHTML = `<div class="w-8 h-8 shrink-0 rounded-full bg-primary-container flex items-center justify-center text-primary"><span class="material-symbols-outlined text-[20px]">psychology</span></div>
    <div class="bg-surface-container-low px-lg py-md rounded-2xl rounded-bl-sm"><span class="inline-flex gap-1"><span class="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></span><span class="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style="animation-delay:0.15s"></span><span class="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style="animation-delay:0.3s"></span></span></div>`;
  return el;
}

const chat = () => document.getElementById('chat');
function scrollDown() { chat().scrollTop = chat().scrollHeight; }

async function send(text) {
  if (!text.trim()) return;
  messages.push({ role: 'user', text });
  chat().appendChild(bubble('user', text));
  scrollDown();
  document.getElementById('suggestions').innerHTML = '';

  const typing = typingIndicator();
  chat().appendChild(typing);
  scrollDown();

  try {
    const { reply } = await api.post('/tutor/chat', { messages });
    typing.remove();
    messages.push({ role: 'model', text: reply });
    chat().appendChild(bubble('model', reply));
  } catch (e) {
    typing.remove();
    chat().appendChild(bubble('model', `⚠️ ${e.message}`));
  }
  scrollDown();
}

document.addEventListener('DOMContentLoaded', () => {
  api.get('/dashboard').then((d) => setShellAvatar(d.user.avatar_url)).catch(() => {});

  // Greeting
  chat().appendChild(bubble('model', "Hi! I'm your Stride AI Tutor. Ask me to explain a concept, quiz you, or help plan your study session."));

  document.getElementById('suggestions').innerHTML = SUGGESTIONS
    .map((s) => `<button class="suggestion px-md py-sm rounded-full border border-outline-variant text-label-sm text-on-surface-variant hover:bg-primary-container/20 transition-colors">${s}</button>`)
    .join('');
  document.querySelectorAll('.suggestion').forEach((b) => b.addEventListener('click', () => send(b.textContent)));

  const input = document.getElementById('chat-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 128) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chat-form').requestSubmit();
    }
  });

  document.getElementById('chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = '';
    input.style.height = 'auto';
    send(text);
  });
});
