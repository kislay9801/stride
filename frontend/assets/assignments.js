/* Assignment Breakdown: list assignments, generate roadmaps via Gemini, toggle task status. */

let assignments = [];
let currentId = null;
let extractedText = ''; // text pulled from an uploaded file, client-side

// Configure the pdf.js worker (loaded via CDN in assignments.html).
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n';
  }
  return text;
}

// Reads a dropped/picked file entirely in the browser and stores its text,
// so we never upload the raw file (avoids size limits + extracts real PDF text).
async function handleFile(file) {
  if (!file) return;
  extractedText = '';
  const nameEl = document.getElementById('file-name');
  nameEl.textContent = `Reading ${file.name}…`;
  try {
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    if (isPdf && !window.pdfjsLib) throw new Error('PDF reader failed to load');
    extractedText = (isPdf ? await extractPdfText(file) : await file.text()).trim().slice(0, 20000);
    nameEl.textContent = extractedText
      ? `${file.name} ✓ — ${extractedText.length} characters extracted`
      : `${file.name}: no text found (scanned PDF?). Paste the brief instead.`;
  } catch (err) {
    extractedText = '';
    nameEl.textContent = `Couldn't read ${file.name}. Paste the text instead.`;
  }
}

const stepIcon = {
  done: { wrap: 'bg-secondary text-white', icon: 'check' },
  active: { wrap: 'bg-primary text-white ring-4 ring-primary-container/20', icon: 'play_arrow' },
  upcoming: { wrap: 'bg-surface-container-highest text-on-surface-variant', icon: 'radio_button_unchecked' },
};

function roadmapItem(t, isLast) {
  const s = stepIcon[t.status] || stepIcon.upcoming;
  const badge = {
    done: '<span class="text-label-sm text-secondary font-bold">Completed</span>',
    active: '<span class="px-md py-xs bg-secondary-container text-on-secondary-container text-label-sm rounded-full font-bold">Next Up</span>',
    upcoming: '<span class="text-label-sm text-on-surface-variant">Scheduled</span>',
  }[t.status];
  const titleCls = t.status === 'done' ? 'text-on-surface-variant line-through' : 'text-on-surface';
  const hoursLabel = t.status === 'done' ? `${t.spent_hours}h spent` : `${t.estimate_hours}h estimate`;
  const due = t.due_date ? `<div class="flex items-center gap-xs text-label-sm ${t.status === 'active' ? 'text-error' : 'text-on-surface-variant'} font-medium"><span class="material-symbols-outlined text-[16px]">event</span>${t.due_date}</div>` : '';
  const toggle = t.status === 'done'
    ? `<button data-reopen="${t.id}" class="text-on-surface-variant font-label-sm hover:underline">Reopen</button>`
    : `<button data-done="${t.id}" class="text-primary font-label-sm hover:underline">Mark Done</button>`;

  return `<div class="group flex gap-lg p-lg rounded-xl ${t.status === 'active' ? 'bg-primary-container/10 border border-primary-container/30' : 'hover:bg-surface-container-low'} transition-colors items-start">
    <div class="flex flex-col items-center">
      <div class="w-8 h-8 rounded-full ${s.wrap} flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">${s.icon}</span></div>
      ${isLast ? '' : '<div class="w-0.5 h-16 bg-surface-container-highest mt-sm"></div>'}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-sm mb-xs">
        <h4 class="font-label-md font-bold ${titleCls} break-words min-w-0">${t.title}</h4><span class="shrink-0">${badge}</span>
      </div>
      <p class="text-body-md break-words ${t.status === 'done' ? 'text-on-surface-variant/60' : 'text-on-surface-variant'}">${t.description || ''}</p>
      <div class="mt-md flex flex-wrap gap-x-md gap-y-sm items-center">
        <div class="flex items-center gap-xs text-label-sm text-on-surface-variant"><span class="material-symbols-outlined text-[16px]">schedule</span>${hoursLabel}</div>
        ${due}
        <div class="ml-auto flex items-center gap-md">
          ${toggle}
          <button data-edit="${t.id}" title="Edit step" class="text-on-surface-variant hover:text-primary"><span class="material-symbols-outlined text-[18px]">edit</span></button>
          <button data-delstep="${t.id}" title="Delete step" class="text-on-surface-variant hover:text-error"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderRoadmap() {
  const a = assignments.find((x) => x.id === currentId);
  const roadmap = document.getElementById('roadmap');
  document.getElementById('add-step-btn').disabled = !a;
  if (!a) {
    roadmap.innerHTML = '<p class="text-on-surface-variant text-body-md">No assignment yet. Generate one on the left to build your roadmap.</p>';
    document.getElementById('remaining-pill').textContent = '';
    document.getElementById('context').innerHTML = '<p class="text-label-sm text-on-surface-variant">Select or generate an assignment to see its context.</p>';
    return;
  }

  const remaining = a.tasks.filter((t) => t.status !== 'done').length;
  document.getElementById('remaining-pill').textContent = `${remaining} Task${remaining === 1 ? '' : 's'} Remaining`;
  roadmap.innerHTML = a.tasks.length
    ? a.tasks.map((t, i) => roadmapItem(t, i === a.tasks.length - 1)).join('')
    : '<p class="text-on-surface-variant text-body-md">No steps yet. Use “+ Step” to add one.</p>';

  roadmap.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => updateTask(b.dataset.done, 'done')));
  roadmap.querySelectorAll('[data-reopen]').forEach((b) => b.addEventListener('click', () => updateTask(b.dataset.reopen, 'upcoming')));
  roadmap.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openStepModal(a.tasks.find((t) => t.id === Number(b.dataset.edit)))));
  roadmap.querySelectorAll('[data-delstep]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this step?')) return;
    await api.del(`/tasks/${b.dataset.delstep}`);
    toast('Step deleted', 'success');
    await refresh(currentId);
  }));

  document.getElementById('context').innerHTML = `
    <div class="flex flex-col">
      <span class="text-label-sm text-on-surface-variant uppercase tracking-wider">Estimated Effort</span>
      <span class="text-headline-md font-bold text-on-surface">${a.estimated_effort_hours} Hours</span>
    </div>
    <div class="flex flex-col">
      <span class="text-label-sm text-on-surface-variant uppercase tracking-wider">Primary Goal</span>
      <span class="text-body-md text-on-surface">${a.primary_goal || '—'}</span>
    </div>
    <div class="h-1 bg-surface-container-highest rounded-full overflow-hidden">
      <div class="h-full bg-primary shadow-[0_0_8px_rgba(55,101,107,0.4)]" style="width:${a.progress}%"></div>
    </div>
    <p class="text-label-sm text-on-surface-variant italic">Progress: ${a.progress}% Completed</p>`;
}

async function updateTask(id, status) {
  await api.patch(`/tasks/${id}`, { status });
  await refresh(currentId);
}

// --- Add/Edit step modal ---
let editingStepId = null;

function openStepModal(task) {
  if (!currentId) return toast('Select an assignment first.', 'error');
  editingStepId = task ? task.id : null;
  document.getElementById('step-modal-title').textContent = task ? 'Edit Step' : 'Add Step';
  document.getElementById('step-title').value = task?.title || '';
  document.getElementById('step-desc').value = task?.description || '';
  document.getElementById('step-estimate').value = task?.estimate_hours ?? '';
  document.getElementById('step-due').value = task?.due_date || '';
  document.getElementById('step-modal').classList.remove('hidden');
  document.getElementById('step-title').focus();
}

function closeStepModal() {
  document.getElementById('step-modal').classList.add('hidden');
}

function setupStepModal() {
  const modal = document.getElementById('step-modal');
  document.getElementById('add-step-btn').addEventListener('click', () => openStepModal());
  document.getElementById('step-close').addEventListener('click', closeStepModal);
  document.getElementById('step-cancel').addEventListener('click', closeStepModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeStepModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeStepModal(); });

  document.getElementById('step-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('step-title').value.trim();
    if (!title) return;
    const payload = {
      title,
      description: document.getElementById('step-desc').value.trim(),
      estimate_hours: Number(document.getElementById('step-estimate').value) || 0,
      due_date: document.getElementById('step-due').value.trim() || null,
    };
    const btn = document.getElementById('step-submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      if (editingStepId) await api.patch(`/tasks/${editingStepId}`, payload);
      else await api.post(`/assignments/${currentId}/tasks`, payload);
      closeStepModal();
      toast(editingStepId ? 'Step updated' : 'Step added', 'success');
      await refresh(currentId);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}

function renderSelect() {
  const sel = document.getElementById('assignment-select');
  sel.innerHTML = assignments.map((a) => `<option value="${a.id}" ${a.id === currentId ? 'selected' : ''}>${a.title}</option>`).join('')
    || '<option disabled selected>No assignments yet</option>';
}

async function refresh(selectId) {
  assignments = await api.get('/assignments');
  currentId = selectId && assignments.some((a) => a.id === selectId) ? selectId : assignments[0]?.id ?? null;
  renderSelect();
  renderRoadmap();
}

document.addEventListener('DOMContentLoaded', async () => {
  api.get('/dashboard').then((d) => setShellAvatar(d.user.avatar_url)).catch(() => {});
  setupStepModal();
  const wantId = Number(new URLSearchParams(location.search).get('assignment')) || undefined;
  try {
    await refresh(wantId);
  } catch (e) {
    toast(e.message, 'error');
  }

  document.getElementById('assignment-select').addEventListener('change', (e) => {
    currentId = Number(e.target.value);
    renderRoadmap();
  });

  // File picker / drag-drop — text is extracted in the browser (see handleFile).
  const dz = document.getElementById('drop-zone');
  const fi = document.getElementById('file-input');
  dz.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => handleFile(fi.files[0]));
  ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('bg-primary-container/20'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('bg-primary-container/20'); }));
  dz.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  // Generate roadmap — sends extracted text as JSON (no raw file upload).
  document.getElementById('breakdown-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title-input').value.trim();
    const typed = document.getElementById('brief-input').value.trim();
    const brief = [typed, extractedText].filter(Boolean).join('\n\n').trim();
    if (!brief) return toast('Paste a brief or upload a readable file first.', 'error');

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span> Analyzing…';
    try {
      const created = await api.post('/assignments/breakdown', { title: title || undefined, brief });
      toast('Roadmap generated ✓', 'success');
      document.getElementById('brief-input').value = '';
      document.getElementById('title-input').value = '';
      extractedText = '';
      document.getElementById('file-name').textContent = 'Drop a .txt / .md / .pdf, or click to browse.';
      await refresh(created.id);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
});
