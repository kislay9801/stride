/* Settings: profile (edit name), dark-mode toggle, account (sign out). */

function applyThemeToggleUI(isDark) {
  const toggle = document.getElementById('theme-toggle');
  const knob = document.getElementById('theme-knob');
  toggle.classList.toggle('bg-primary', isDark);
  toggle.classList.toggle('bg-surface-container-highest', !isDark);
  knob.style.transform = isDark ? 'translateX(24px)' : 'translateX(0)';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Theme toggle
  const isDark = document.documentElement.classList.contains('dark');
  applyThemeToggleUI(isDark);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const nowDark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', nowDark);
    document.documentElement.classList.toggle('light', !nowDark);
    localStorage.setItem('stride-theme', nowDark ? 'dark' : 'light');
    applyThemeToggleUI(nowDark);
  });

  // Profile
  let me;
  try {
    me = await api.get('/me');
  } catch (e) {
    return toast(e.message, 'error');
  }
  const u = me.user;
  setShellAvatar(u.avatar_url);
  const avatar = document.getElementById('settings-avatar');
  if (u.avatar_url) avatar.innerHTML = `<img class="w-full h-full object-cover" src="${u.avatar_url}" alt="Avatar"/>`;
  document.getElementById('settings-email').textContent = u.email || (me.authEnabled ? '' : 'Demo account (no sign-in)');
  document.getElementById('name-input').value = u.name || '';

  document.getElementById('save-name').addEventListener('click', async () => {
    const name = document.getElementById('name-input').value.trim();
    if (!name) return toast('Name cannot be empty', 'error');
    try {
      await api.patch('/me', { name });
      toast('Profile updated', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  });

  // Account
  const accountBody = document.getElementById('account-body');
  if (me.authEnabled) {
    accountBody.innerHTML = `<button id="signout" class="flex items-center gap-sm px-lg py-md bg-error-container text-on-error-container rounded-xl font-label-md hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined">logout</span>Sign out</button>`;
    document.getElementById('signout').addEventListener('click', () => window.Stride.signOut());
  } else {
    accountBody.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant">You're in <b>demo mode</b> — no sign-in required. Add your Firebase keys in <code class="px-1 bg-surface-container-high rounded">frontend/assets/firebase-config.js</code> to enable accounts and Google sign-in.</p>`;
  }
});
