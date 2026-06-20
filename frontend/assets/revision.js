/* Revision Hub: notebooks + AI-generated flashcards, quizzes, summaries. */

let notebooks = [];
let mastery = [];
let current = null;
let activeTab = 'flashcards';

function renderMastery() {
  document.getElementById('mastery').innerHTML = mastery.length
    ? mastery.map((m) => `<div class="space-y-sm">
        <div class="flex justify-between text-label-md"><span>${m.subject}</span><span class="font-bold text-primary">${m.percent}%</span></div>
        <div class="h-1.5 bg-primary-container rounded-full overflow-hidden"><div class="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(55,101,107,0.3)]" style="width:${m.percent}%"></div></div>
      </div>`).join('')
    : '<p class="text-label-sm text-on-surface-variant">No mastery data yet.</p>';
}

function flashcardEl(c) {
  return `<div class="flashcard h-64 cursor-pointer">
    <div class="flashcard-inner text-center shadow-sm rounded-xl">
      <div class="flashcard-front absolute inset-0 glass-panel bg-white/80 p-lg flex flex-col justify-between items-center rounded-xl border border-primary/20">
        <p class="text-label-sm text-primary uppercase tracking-widest font-bold">${c.label || 'Concept'}</p>
        <p class="font-headline-md text-on-surface">${c.front}</p>
        <div class="flex items-center gap-sm text-on-surface-variant text-label-sm"><span class="material-symbols-outlined">touch_app</span><span>Tap to flip</span></div>
      </div>
      <div class="flashcard-back absolute inset-0 bg-primary-container p-lg flex flex-col justify-center items-center rounded-xl">
        <p class="text-body-md text-on-primary-container leading-relaxed">${c.back}</p>
      </div>
    </div>
  </div>`;
}

function renderFlashcards() {
  const cards = (current?.flashcards || []).map(flashcardEl).join('');
  const add = `<div id="add-card" class="border-2 border-dashed border-primary/30 rounded-xl p-lg h-64 flex flex-col justify-center items-center text-primary hover:border-primary transition-all cursor-pointer bg-primary-container/5">
    <span class="material-symbols-outlined text-[40px]">add_circle</span><p class="font-label-md mt-sm">Create New Card</p></div>`;
  document.getElementById('flashcards').innerHTML = cards + add;
  document.getElementById('add-card').addEventListener('click', openCardModal);
}

function renderQuizzes() {
  const host = document.getElementById('quizzes');
  const quizzes = current?.quizzes || [];
  if (!quizzes.length) {
    host.innerHTML = emptyState('quiz', 'No quizzes yet', 'Generate study materials to create a quiz from your notes.');
    return;
  }
  host.innerHTML = quizzes.map((q, qi) => `
    <div class="glass-panel rounded-xl p-xl bg-white/80 border border-primary/20" data-quiz="${qi}">
      <div class="flex flex-col md:flex-row items-center gap-xl">
        <div class="bg-primary-container/40 p-lg rounded-full"><span class="material-symbols-outlined text-[56px] text-primary">psychology_alt</span></div>
        <div class="flex-1 space-y-md text-center md:text-left">
          <h3 class="text-headline-md font-headline-md text-on-surface">${q.title}</h3>
          <p class="text-body-md text-on-surface-variant">${q.description || ''}</p>
          <div class="flex flex-wrap gap-md justify-center md:justify-start">
            <span class="flex items-center gap-xs text-label-md bg-primary-container/30 text-on-primary-container px-md py-xs rounded-full"><span class="material-symbols-outlined text-[18px]">timer</span>${q.duration_min} min</span>
            <span class="flex items-center gap-xs text-label-md bg-primary-container/30 text-on-primary-container px-md py-xs rounded-full"><span class="material-symbols-outlined text-[18px]">list_alt</span>${q.questions.length} Questions</span>
          </div>
        </div>
        <button class="start-quiz bg-primary text-on-primary px-xl py-md rounded-xl font-label-md hover:shadow-lg transition-all active:scale-95">Start Quiz</button>
      </div>
      <div class="quiz-runner hidden mt-lg pt-lg border-t border-primary/10"></div>
    </div>`).join('');

  host.querySelectorAll('[data-quiz]').forEach((card) => {
    const qi = Number(card.dataset.quiz);
    card.querySelector('.start-quiz').addEventListener('click', () => runQuiz(card, current.quizzes[qi]));
  });
}

function runQuiz(card, quiz) {
  const runner = card.querySelector('.quiz-runner');
  card.querySelector('.start-quiz').classList.add('hidden');
  runner.classList.remove('hidden');
  let idx = 0, score = 0;

  const showQ = () => {
    const q = quiz.questions[idx];
    runner.innerHTML = `
      <p class="text-label-sm text-primary font-bold mb-sm">Question ${idx + 1} of ${quiz.questions.length}</p>
      <p class="font-headline-md text-on-surface mb-md">${q.question}</p>
      <div class="space-y-sm">${q.options.map((o, i) => `<button class="opt w-full text-left px-lg py-md rounded-xl border border-outline-variant hover:bg-primary-container/20 transition-colors font-body-md" data-i="${i}">${o}</button>`).join('')}</div>
      <p class="explain hidden mt-md text-body-md p-md rounded-lg bg-surface-container-low"></p>
      <button class="next hidden mt-md bg-primary text-on-primary px-lg py-sm rounded-full font-label-md">Next</button>`;
    runner.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
      runner.querySelectorAll('.opt').forEach((x) => { x.disabled = true; });
      const chosen = Number(b.dataset.i);
      const correct = q.answerIndex;
      runner.querySelectorAll('.opt')[correct].classList.add('bg-secondary-container', 'border-secondary');
      if (chosen === correct) { score++; } else { b.classList.add('bg-error-container', 'border-error'); }
      const ex = runner.querySelector('.explain');
      ex.textContent = q.explanation || (chosen === correct ? 'Correct!' : 'Not quite.');
      ex.classList.remove('hidden');
      runner.querySelector('.next').classList.remove('hidden');
    }));
    runner.querySelector('.next').addEventListener('click', () => {
      idx++;
      if (idx < quiz.questions.length) showQ();
      else runner.innerHTML = `<div class="text-center py-lg"><p class="font-display text-headline-lg text-primary">${score}/${quiz.questions.length}</p><p class="text-on-surface-variant">Quiz complete! ${score === quiz.questions.length ? 'Perfect score 🎉' : 'Keep practicing.'}</p></div>`;
    });
  };
  showQ();
}

function renderSummaries() {
  const host = document.getElementById('summaries');
  const summaries = current?.summaries || [];
  host.innerHTML = summaries.length
    ? summaries.map((s) => `<div class="glass-panel rounded-xl p-lg border-l-4 border-primary bg-white/80">
        <div class="flex justify-between items-start mb-md"><h4 class="font-headline-md text-on-surface">${s.title}</h4><span class="text-label-sm text-on-surface-variant whitespace-nowrap ml-md">${s.read_time}</span></div>
        <p class="text-body-md text-on-surface-variant">${s.body}</p></div>`).join('')
    : emptyState('summarize', 'No summaries yet', 'Generate study materials to summarize your notes.');
}

function emptyState(icon, title, sub) {
  return `<div class="col-span-full glass-panel rounded-xl p-xl bg-white/60 flex flex-col items-center text-center gap-sm">
    <span class="material-symbols-outlined text-[48px] text-primary/60">${icon}</span>
    <h3 class="font-headline-md text-on-surface">${title}</h3>
    <p class="text-body-md text-on-surface-variant max-w-sm">${sub}</p></div>`;
}

function renderNotebook() {
  if (!current) return;
  document.getElementById('nb-title').textContent = current.title;
  document.getElementById('nb-meta').textContent = `${current.pages || 1} page${current.pages === 1 ? '' : 's'}`;
  document.getElementById('nb-content').value = current.content || '';
  document.getElementById('nb-tags').innerHTML = (current.tags || [])
    .map((t) => `<span class="px-md py-xs bg-primary-container/40 text-on-primary-container rounded-full text-label-sm font-medium">${t}</span>`).join('');
  renderFlashcards();
  renderQuizzes();
  renderSummaries();
}

function renderSelect() {
  document.getElementById('notebook-select').innerHTML =
    notebooks.map((n) => `<option value="${n.id}" ${n.id === current?.id ? 'selected' : ''}>${n.title}</option>`).join('')
    || '<option disabled selected>No notebooks</option>';
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('bg-primary', on);
    b.classList.toggle('text-on-primary', on);
    b.classList.toggle('font-bold', on);
    b.classList.toggle('shadow-sm', on);
    b.classList.toggle('text-on-surface-variant', !on);
    b.classList.toggle('font-medium', !on);
  });
  document.querySelectorAll('.tab-pane').forEach((p) => {
    const show = p.id === tab;
    p.classList.toggle('hidden', !show);
    if (show) p.classList.add('fade-in'); else p.classList.remove('fade-in');
  });
}

function openCardModal() {
  if (!current) return toast('Create a notebook first.', 'error');
  document.getElementById('card-form').reset();
  document.getElementById('card-label').value = 'Concept';
  document.getElementById('card-modal').classList.remove('hidden');
  document.getElementById('card-front').focus();
}
function closeCardModal() { document.getElementById('card-modal').classList.add('hidden'); }

function setupCardModal() {
  const modal = document.getElementById('card-modal');
  document.getElementById('card-close').addEventListener('click', closeCardModal);
  document.getElementById('card-cancel').addEventListener('click', closeCardModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeCardModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeCardModal(); });

  document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const front = document.getElementById('card-front').value.trim();
    const back = document.getElementById('card-back').value.trim();
    if (!front || !back) return;
    const btn = document.getElementById('card-submit');
    btn.disabled = true; btn.textContent = 'Adding…';
    try {
      const card = await api.post(`/notebooks/${current.id}/flashcards`, {
        front, back, label: document.getElementById('card-label').value.trim() || 'Concept',
      });
      current.flashcards.push(card);
      renderFlashcards();
      closeCardModal();
      toast('Card added', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Add Card';
    }
  });
}

// New Notebook modal
function openNotebookModal() {
  document.getElementById('notebook-form').reset();
  document.getElementById('notebook-modal').classList.remove('hidden');
  document.getElementById('nb-new-title').focus();
}
function closeNotebookModal() { document.getElementById('notebook-modal').classList.add('hidden'); }

function setupNotebookModal() {
  const modal = document.getElementById('notebook-modal');
  document.getElementById('nb-close').addEventListener('click', closeNotebookModal);
  document.getElementById('nb-cancel').addEventListener('click', closeNotebookModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeNotebookModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeNotebookModal(); });

  document.getElementById('notebook-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('nb-new-title').value.trim();
    if (!title) return;
    const tags = document.getElementById('nb-new-tags').value.split(',').map((t) => t.trim()).filter(Boolean);
    const content = document.getElementById('nb-new-content').value.trim();
    const btn = document.getElementById('nb-submit');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const nb = await api.post('/notebooks', { title, content, tags });
      closeNotebookModal();
      await load(nb.id);
      toast('Notebook created', 'success');
      // If notes were pasted, generate all study materials automatically.
      if (content) await generateAll();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create';
    }
  });
}

async function load(selectId) {
  const data = await api.get('/notebooks');
  notebooks = data.notebooks;
  mastery = data.mastery;
  current = notebooks.find((n) => n.id === selectId) || notebooks[0] || null;
  renderSelect();
  renderMastery();
  renderNotebook();
}

document.addEventListener('DOMContentLoaded', async () => {
  api.get('/dashboard').then((d) => setShellAvatar(d.user.avatar_url)).catch(() => {});
  const wantId = Number(new URLSearchParams(location.search).get('notebook')) || undefined;
  try {
    await load(wantId);
  } catch (e) {
    toast(e.message, 'error');
  }

  document.querySelectorAll('.tab-btn').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  document.getElementById('notebook-select').addEventListener('change', (e) => {
    current = notebooks.find((n) => n.id === Number(e.target.value));
    renderNotebook();
  });

  // Persist note edits on blur so generation uses the latest content.
  document.getElementById('nb-content').addEventListener('blur', async (e) => {
    if (!current || e.target.value === current.content) return;
    current.content = e.target.value;
    try {
      await api.patch(`/notebooks/${current.id}`, { content: current.content });
      toast('Notes saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  setupNotebookModal();
  setupCardModal();
  document.getElementById('new-notebook-btn').addEventListener('click', openNotebookModal);

  document.getElementById('generate-btn').addEventListener('click', () => generateAll());
});

// Generates flashcards, a quiz, and summaries together from the notebook's notes.
async function generateAll() {
  if (!current) return toast('Create a notebook first.', 'error');
  if (!(current.content || '').trim()) return toast('Write or paste some notes first.', 'error');

  const btn = document.getElementById('generate-btn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Generating…';
  try {
    const res = await api.post(`/notebooks/${current.id}/generate`, { type: 'all' });
    if (res.flashcards) current.flashcards.push(...res.flashcards);
    if (res.quiz) current.quizzes.push(res.quiz);
    if (res.summaries) current.summaries.push(...res.summaries);
    renderNotebook();
    switchTab('flashcards');
    toast('Generated flashcards, quiz & summaries ✓', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
