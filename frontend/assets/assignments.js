/* Assignment Breakdown: list assignments, generate roadmaps via Gemini, toggle task status. */

let assignments = [];
let currentId = null;
let pickedFile = null;

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
    ? `<button data-reopen="${t.id}" class="ml-auto text-on-surface-variant font-label-sm hover:underline">Reopen</button>`
    : `<button data-done="${t.id}" class="ml-auto text-primary font-label-sm hover:underline">Mark Done</button>`;

  return `<div class="group flex gap-lg p-lg rounded-xl ${t.status === 'active' ? 'bg-primary-container/10 border border-primary-container/30' : 'hover:bg-surface-container-low'} transition-colors items-start">
    <div class="flex flex-col items-center">
      <div class="w-8 h-8 rounded-full ${s.wrap} flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">${s.icon}</span></div>
      ${isLast ? '' : '<div class="w-0.5 h-16 bg-surface-container-highest mt-sm"></div>'}
    </div>
    <div class="flex-1">
      <div class="flex items-center justify-between mb-xs">
        <h4 class="font-label-md font-bold ${titleCls}">${t.title}</h4>${badge}
      </div>
      <p class="text-body-md ${t.status === 'done' ? 'text-on-surface-variant/60' : 'text-on-surface-variant'}">${t.description || ''}</p>
      <div class="mt-md flex gap-lg items-center">
        <div class="flex items-center gap-xs text-label-sm text-on-surface-variant"><span class="material-symbols-outlined text-[16px]">schedule</span>${hoursLabel}</div>
        ${due}${toggle}
      </div>
    </div>
  </div>`;
}

function renderRoadmap() {
  const a = assignments.find((x) => x.id === currentId);
  const roadmap = document.getElementById('roadmap');
  if (!a) {
    roadmap.innerHTML = '<p class="text-on-surface-variant text-body-md">No assignment yet. Generate one on the left to build your roadmap.</p>';
    document.getElementById('remaining-pill').textContent = '';
    document.getElementById('context').innerHTML = '<p class="text-label-sm text-on-surface-variant">Select or generate an assignment to see its context.</p>';
    return;
  }

  const remaining = a.tasks.filter((t) => t.status !== 'done').length;
  document.getElementById('remaining-pill').textContent = `${remaining} Task${remaining === 1 ? '' : 's'} Remaining`;
  roadmap.innerHTML = a.tasks.map((t, i) => roadmapItem(t, i === a.tasks.length - 1)).join('');

  roadmap.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => updateTask(b.dataset.done, 'done')));
  roadmap.querySelectorAll('[data-reopen]').forEach((b) => b.addEventListener('click', () => updateTask(b.dataset.reopen, 'upcoming')));

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

  // File picker / drag-drop
  const dz = document.getElementById('drop-zone');
  const fi = document.getElementById('file-input');
  dz.addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => {
    pickedFile = fi.files[0] || null;
    document.getElementById('file-name').textContent = pickedFile ? pickedFile.name : 'Drop a .txt / .md / .pdf, or click to browse.';
  });
  ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('bg-primary-container/20'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('bg-primary-container/20'); }));
  dz.addEventListener('drop', (e) => {
    pickedFile = e.dataTransfer.files[0] || null;
    document.getElementById('file-name').textContent = pickedFile ? pickedFile.name : '';
  });

  // Generate roadmap
  document.getElementById('breakdown-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title-input').value.trim();
    const brief = document.getElementById('brief-input').value.trim();
    if (!brief && !pickedFile) return toast('Paste a brief or upload a file first.', 'error');

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">refresh</span> Analyzing…';
    try {
      const fd = new FormData();
      if (title) fd.append('title', title);
      if (brief) fd.append('brief', brief);
      if (pickedFile) fd.append('file', pickedFile);
      const created = await api.postForm('/assignments/breakdown', fd);
      toast('Roadmap generated ✓', 'success');
      document.getElementById('brief-input').value = '';
      document.getElementById('title-input').value = '';
      pickedFile = null;
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
