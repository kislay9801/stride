/* Shared helpers: API client, toast, and the app shell (sidebar + top bar). */

const api = {
  async request(method, path, body, isForm = false) {
    const opts = { method, headers: {} };

    // Attach the Firebase ID token when auth is enabled.
    const token = window.Stride ? await window.Stride.getToken() : null;
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    if (body !== undefined) {
      if (isForm) {
        opts.body = body; // FormData — let the browser set the content-type
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(`/api${path}`, opts);
    if (res.status === 401 && window.Stride?.authEnabled) {
      window.location.replace('/login.html');
      throw new Error('Session expired');
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  },
  get(p) { return this.request('GET', p); },
  post(p, b) { return this.request('POST', p, b); },
  postForm(p, fd) { return this.request('POST', p, fd, true); },
  patch(p, b) { return this.request('PATCH', p, b); },
  del(p) { return this.request('DELETE', p); },
};

function toast(message, kind = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'fixed bottom-lg left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-sm items-center';
    document.body.appendChild(host);
  }
  const colors = {
    info: 'bg-on-surface text-white',
    success: 'bg-secondary text-white',
    error: 'bg-error text-white',
  };
  const el = document.createElement('div');
  el.className = `${colors[kind] || colors.info} px-lg py-md rounded-xl shadow-xl font-label-md text-label-md max-w-md fade-in`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

const NAV_ITEMS = [
  { href: '/index.html', label: 'Dashboard', icon: 'dashboard', match: ['/', '/index.html'] },
  { href: '/assignments.html', label: 'Assignment Breakdown', icon: 'assignment_turned_in', match: ['/assignments.html'] },
  { href: '/tutor.html', label: 'AI Tutor', icon: 'psychology', match: ['/tutor.html'] },
  { href: '/revision.html', label: 'Revision Hub', icon: 'auto_stories', match: ['/revision.html'] },
];

function renderShell() {
  const path = window.location.pathname;
  const navLinks = NAV_ITEMS.map((item) => {
    const active = item.match.includes(path);
    const cls = active
      ? 'flex items-center gap-md px-md py-sm text-primary font-bold border-r-2 border-primary bg-primary-container/20 rounded-lg transition-colors'
      : 'flex items-center gap-md px-md py-sm text-on-surface-variant font-medium hover:bg-primary-container/30 rounded-lg transition-colors active:scale-95';
    return `<a class="${cls}" href="${item.href}">
        <span class="material-symbols-outlined" ${active ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${item.icon}</span>
        <span class="font-body-md text-body-md">${item.label}</span>
      </a>`;
  }).join('');

  const shell = document.getElementById('app-shell');
  if (!shell) return;
  shell.innerHTML = `
    <nav class="h-screen w-64 fixed left-0 top-0 flex flex-col py-xl px-md bg-surface-container-low z-50 border-r border-outline-variant/20">
      <div class="mb-xl px-md">
        <h1 class="text-headline-md font-headline-md font-bold text-primary">Stride</h1>
        <p class="font-body-md text-body-md text-on-surface-variant">Stay Focused</p>
      </div>
      <div class="flex-1 flex flex-col gap-sm">${navLinks}</div>
      <div class="mt-auto flex flex-col gap-sm">
        <div class="flex flex-col gap-xs pt-md border-t border-outline-variant/30">
          <a class="flex items-center gap-md px-md py-sm ${window.location.pathname === '/settings.html' ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'} hover:bg-primary-container/30 rounded-lg transition-colors" href="/settings.html"><span class="material-symbols-outlined">settings</span><span class="font-body-md text-body-md">Settings</span></a>
          <a class="flex items-center gap-md px-md py-sm text-on-surface-variant font-medium hover:bg-primary-container/30 rounded-lg transition-colors" href="/settings.html#help"><span class="material-symbols-outlined">help</span><span class="font-body-md text-body-md">Help</span></a>
          <button id="signout-btn" class="hidden items-center gap-md px-md py-sm text-error font-medium hover:bg-error-container/30 rounded-lg transition-colors w-full"><span class="material-symbols-outlined">logout</span><span class="font-body-md text-body-md">Sign Out</span></button>
        </div>
      </div>
    </nav>
    <header class="fixed top-0 right-0 left-64 h-16 glass-effect z-40 flex items-center justify-between px-gutter border-b border-outline-variant/10">
      <div class="flex-1 max-w-xl relative">
        <div class="relative flex items-center bg-surface-container-high rounded-full px-lg py-xs">
          <span class="material-symbols-outlined text-on-surface-variant mr-sm">search</span>
          <input id="global-search" autocomplete="off" class="bg-transparent border-none focus:ring-0 w-full font-body-md text-body-md placeholder:text-on-surface-variant/50" placeholder="Search tasks, notebooks, assignments..." type="text"/>
        </div>
        <div id="search-results" class="hidden absolute top-full left-0 right-0 mt-sm bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 max-h-96 overflow-y-auto custom-scrollbar z-50"></div>
      </div>
      <div class="flex items-center gap-lg">
        <button class="material-symbols-outlined text-primary p-xs hover:bg-surface-container-highest/50 rounded-full transition-all active:scale-90">notifications</button>
        <div id="shell-avatar" class="w-8 h-8 rounded-full bg-primary-fixed-dim overflow-hidden border-2 border-white"></div>
      </div>
    </header>`;

  // Sign-out button only matters when auth is enabled.
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn && window.Stride?.authEnabled) {
    signoutBtn.classList.remove('hidden');
    signoutBtn.classList.add('flex');
    signoutBtn.addEventListener('click', () => window.Stride.signOut());
  }

  wireSearch();
}

// Sets the avatar in the top bar once user data is loaded.
function setShellAvatar(url) {
  const el = document.getElementById('shell-avatar');
  if (el && url) el.innerHTML = `<img class="w-full h-full object-cover" src="${url}" alt="Profile"/>`;
}

// Global search: debounced fetch of /api/search, grouped dropdown with deep links.
function wireSearch() {
  const input = document.getElementById('global-search');
  const panel = document.getElementById('search-results');
  if (!input || !panel) return;
  let timer;

  const hide = () => panel.classList.add('hidden');
  const groupHtml = (label, items, render) =>
    items.length
      ? `<div class="px-md pt-md pb-xs text-label-sm text-on-surface-variant uppercase tracking-widest">${label}</div>${items.map(render).join('')}`
      : '';
  const row = (icon, title, href, sub = '') =>
    `<a href="${href}" class="flex items-center gap-md px-md py-sm hover:bg-surface-container-low transition-colors">
      <span class="material-symbols-outlined text-primary">${icon}</span>
      <span class="flex-1 min-w-0"><span class="block font-label-md text-label-md text-on-surface truncate">${title}</span>${sub ? `<span class="block text-label-sm text-on-surface-variant truncate">${sub}</span>` : ''}</span>
    </a>`;

  async function run(q) {
    if (!q.trim()) return hide();
    let r;
    try {
      r = await api.get(`/search?q=${encodeURIComponent(q)}`);
    } catch {
      return hide();
    }
    const total = r.tasks.length + r.notebooks.length + r.assignments.length;
    if (!total) {
      panel.innerHTML = '<div class="px-md py-lg text-center text-on-surface-variant text-body-md">No matches found.</div>';
    } else {
      panel.innerHTML =
        groupHtml('Assignments', r.assignments, (a) => row('assignment_turned_in', a.title, `/assignments.html?assignment=${a.id}`)) +
        groupHtml('Notebooks', r.notebooks, (n) => row('auto_stories', n.title, `/revision.html?notebook=${n.id}`)) +
        groupHtml('Tasks', r.tasks, (t) => row(t.assignment_id ? 'task_alt' : 'event', t.title, t.assignment_id ? '/assignments.html' : '/index.html', t.status));
    }
    panel.classList.remove('hidden');
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => run(input.value), 220);
  });
  input.addEventListener('focus', () => input.value.trim() && run(input.value));
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== input) hide();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

document.addEventListener('DOMContentLoaded', renderShell);
