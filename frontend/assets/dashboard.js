/* Dashboard page: loads /api/dashboard and renders timeline, ring, weekly impact, insight. */

const CIRCUMFERENCE = 552.92; // 2 * pi * 88

function greetingForHour(h) {
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function timelineItem(t) {
  const styles = {
    done: { ring: 'bg-primary text-white', label: 'text-on-surface', sub: 'text-secondary', note: 'Completed' },
    active: { ring: 'bg-primary-fixed text-primary border-4 border-surface-container-lowest', label: 'text-primary', sub: 'text-on-surface-variant', note: '' },
    upcoming: { ring: 'bg-surface-container-high text-on-surface-variant border-4 border-surface-container-lowest', label: 'text-on-surface', sub: 'text-on-surface-variant', note: '' },
  }[t.status] || {};
  const dim = t.status === 'upcoming' ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all' : '';
  const action = t.status === 'active'
    ? `<div class="mt-2"><button data-complete="${t.id}" class="bg-primary text-white px-md py-1 rounded-full font-label-sm text-label-sm hover:brightness-110 transition-all">Mark Complete</button></div>`
    : '';
  return `<div class="relative flex gap-lg items-start pb-lg group ${dim}">
    <div class="w-12 h-12 shrink-0 rounded-full ${styles.ring} flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110">
      <span class="material-symbols-outlined" ${t.status === 'done' ? "style=\"font-variation-settings:'FILL' 1;\"" : ''}>${t.icon}</span>
    </div>
    <div class="pt-2">
      <p class="font-label-md text-label-md font-bold ${styles.label}">${t.title}</p>
      <p class="font-label-sm text-label-sm text-on-surface-variant">${[t.start_time, t.end_time].filter(Boolean).join(' — ')}</p>
      ${styles.note ? `<p class="text-label-sm ${styles.sub} mt-1 font-medium">${styles.note}</p>` : ''}
      ${action}
    </div>
  </div>`;
}

function comingUpItem(c) {
  return `<div class="flex items-center gap-md p-sm hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group" onclick="location.href='/assignments.html'">
    <div class="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
      <span class="material-symbols-outlined">${c.icon || 'task_alt'}</span>
    </div>
    <div class="flex-1">
      <p class="font-label-md text-label-md font-bold text-on-surface">${c.title}</p>
      <p class="font-label-sm text-label-sm text-on-surface-variant">${c.due_date ? `Due ${c.due_date}` : c.assignment || ''}</p>
    </div>
    <span class="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
  </div>`;
}

async function loadDashboard() {
  let d;
  try {
    d = await api.get('/dashboard');
  } catch (e) {
    toast(e.message, 'error');
    return;
  }

  setShellAvatar(d.user.avatar_url);

  // Header
  document.getElementById('greeting').textContent = `${greetingForHour(new Date().getHours())}, ${d.user.name}`;
  const active = d.timeline.filter((t) => t.status !== 'done').length;
  document.getElementById('greeting-sub').textContent =
    active > 0 ? `You have ${active} focus block${active === 1 ? '' : 's'} left today.` : 'All caught up for today. Nice work!';
  document.getElementById('today-label').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  if (d.stats.goalsMet > 0) {
    document.getElementById('goals-pill').innerHTML = `<div class="bg-secondary-container/30 px-lg py-sm rounded-full flex items-center gap-sm">
      <span class="material-symbols-outlined text-secondary" style="font-variation-settings:'FILL' 1;">check_circle</span>
      <span class="font-label-md text-label-md text-on-secondary-container">${d.stats.goalsMet} Daily Goal${d.stats.goalsMet === 1 ? '' : 's'} Met</span></div>`;
  }

  // Timeline (keep the decorative line that's already in the DOM)
  const timeline = document.getElementById('timeline');
  timeline.querySelectorAll('.timeline-item').forEach((n) => n.remove());
  const frag = d.timeline.map((t) => `<div class="timeline-item">${timelineItem(t)}</div>`).join('');
  timeline.insertAdjacentHTML('beforeend', frag);
  timeline.querySelectorAll('[data-complete]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      await api.patch(`/tasks/${btn.dataset.complete}`, { status: 'done' });
      toast('Task completed ✓', 'success');
      loadDashboard();
    })
  );

  // Cognitive load ring
  const cap = d.user.cognitive_load;
  document.getElementById('capacity-value').textContent = `${cap}%`;
  const arc = document.getElementById('capacity-arc');
  setTimeout(() => { arc.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - cap / 100)); }, 300);
  const note = document.getElementById('capacity-note');
  const badge = document.getElementById('capacity-badge');
  if (cap < 40) {
    note.textContent = 'Low capacity. Consider a short break or a light review task.';
    badge.querySelector('span:last-child').textContent = 'Rest Advised';
  } else if (cap <= 80) {
    note.textContent = "You're in the optimal zone for deep work. Avoid high-stress tasks for another hour.";
    badge.querySelector('span:last-child').textContent = 'Optimal State';
  } else {
    note.textContent = 'High load. Wrap up the current task before starting something new.';
    badge.querySelector('span:last-child').textContent = 'High Load';
  }

  // Weekly chart
  const maxH = Math.max(...d.weekly.map((w) => w.hours), 1);
  const peak = d.weekly.reduce((a, b) => (b.hours > a.hours ? b : a), d.weekly[0]);
  document.getElementById('weekly-chart').innerHTML = d.weekly.map((w) => {
    const isPeak = w === peak;
    const h = Math.max(8, Math.round((w.hours / maxH) * 140));
    return `<div class="flex flex-col items-center gap-sm">
      <div class="w-full ${isPeak ? 'bg-primary' : 'bg-primary-container/30'} rounded-t-lg relative" style="height:${h}px">
        ${isPeak ? `<div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-1.5 py-0.5 rounded">${w.hours}h</div>` : ''}
      </div>
      <span class="font-label-sm text-label-sm ${isPeak ? 'text-primary font-bold' : 'text-on-surface-variant'}">${w.weekday}</span>
    </div>`;
  }).join('');

  document.getElementById('weekly-stats').innerHTML = `
    ${statBlock('Focus Time', `${d.stats.focusTime}h`)}
    ${statBlock('Goals Met', `${d.stats.goalsMet}/${d.stats.goalsTotal}`)}
    ${statBlock('Avg / Day', `${(d.stats.focusTime / 7).toFixed(1)}h`)}`;

  // AI insight + coming up
  document.getElementById('ai-insight').textContent = d.user.ai_insight || 'Generate your first insight.';
  document.getElementById('coming-up').innerHTML =
    d.comingUp.length ? d.comingUp.map(comingUpItem).join('') : '<p class="text-label-sm text-on-surface-variant">Nothing scheduled. 🎉</p>';
}

function statBlock(label, value) {
  return `<div>
    <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">${label}</p>
    <p class="font-headline-md text-headline-md text-primary mt-xs">${value}</p>
  </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();

  document.getElementById('regen-insight').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Thinking…';
    try {
      const { insight } = await api.post('/dashboard/insight');
      document.getElementById('ai-insight').textContent = insight;
      toast('Fresh insight generated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">auto_awesome</span> New Insight';
    }
  });

  document.getElementById('fab').addEventListener('click', async () => {
    const title = prompt('New task title:');
    if (!title) return;
    const time = prompt('Time (e.g. "03:00 PM — 04:00 PM"), or leave blank:') || '';
    const [start_time, end_time] = time.split('—').map((s) => s.trim());
    await api.post('/tasks', { title, start_time: start_time || null, end_time: end_time || null });
    toast('Task added', 'success');
    loadDashboard();
  });
});
