/* Login / sign-up page. Uses Firebase Auth (Google + email/password).
   If Firebase isn't configured, auth.js already redirected to "/" — this
   script just guards against that case and explains demo mode. */

let mode = 'signin'; // 'signin' | 'signup'

function setMode(next) {
  mode = next;
  const isSignup = mode === 'signup';
  document.getElementById('form-title').textContent = isSignup ? 'Create your account' : 'Welcome back';
  document.getElementById('form-sub').textContent = isSignup
    ? 'Start organizing your study life.'
    : 'Sign in to continue your study sessions.';
  document.getElementById('submit-btn').textContent = isSignup ? 'Create Account' : 'Sign In';
  document.getElementById('name-field').classList.toggle('hidden', !isSignup);
  document.getElementById('toggle-prompt').textContent = isSignup ? 'Already have an account?' : 'New to Stride?';
  document.getElementById('toggle-mode').textContent = isSignup ? 'Sign in' : 'Create an account';
  document.getElementById('password').setAttribute('autocomplete', isSignup ? 'new-password' : 'current-password');
}

function friendlyError(code) {
  const map = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/user-not-found': 'No account with that email.',
    'auth/email-already-in-use': 'That email is already registered. Try signing in.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'That email address looks invalid.',
    'auth/popup-closed-by-user': 'Sign-in window closed before completing.',
    'auth/popup-blocked': 'Your browser blocked the sign-in popup.',
    'auth/operation-not-allowed': 'Google sign-in is not enabled in Firebase (Authentication → Sign-in method).',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase (Authentication → Settings → Authorized domains).',
    'auth/configuration-not-found': 'Firebase Auth is not configured — enable a sign-in provider in the console.',
  };
  // Show the raw code for anything unmapped so it can be diagnosed.
  return map[code] || `Sign-in failed: ${code || 'unknown error'}`;
}

function runDemoMode() {
  // Banner explaining login is disabled until Firebase is configured.
  const card = document.querySelector('.glass-card');
  const banner = document.createElement('div');
  banner.className = 'bg-tertiary-container/40 text-on-tertiary-container rounded-xl p-md text-label-sm flex gap-sm items-start';
  banner.innerHTML = '<span class="material-symbols-outlined text-[20px]">info</span><span>This is a <b>preview</b>. Login is disabled in demo mode — add your Firebase keys in <code>frontend/assets/firebase-config.js</code> to enable real sign-in.</span>';
  card.prepend(banner);

  document.getElementById('form-sub').textContent = 'Preview of the sign-in screen (demo mode).';

  // Buttons explain instead of attempting a real sign-in.
  const explain = (e) => { e.preventDefault(); toast('Add your Firebase config to enable sign-in.', 'info'); };
  document.getElementById('google-btn').addEventListener('click', explain);
  document.getElementById('auth-form').addEventListener('submit', explain);
  document.getElementById('toggle-mode').addEventListener('click', () =>
    setMode(mode === 'signin' ? 'signup' : 'signin')
  );

  // A real way into the app while in demo mode.
  const note = document.getElementById('demo-note');
  note.innerHTML = '<a href="/" class="text-primary font-bold hover:underline">Continue to the app (demo mode) →</a>';
  note.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.Stride?.authEnabled) {
    // Demo mode: Firebase isn't configured yet. Make that obvious and offer a way in.
    runDemoMode();
    return;
  }

  setMode('signin');

  document.getElementById('toggle-mode').addEventListener('click', () =>
    setMode(mode === 'signin' ? 'signup' : 'signin')
  );

  document.getElementById('google-btn').addEventListener('click', async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await firebase.auth().signInWithPopup(provider);
      window.location.replace('/');
    } catch (e) {
      console.error('Google sign-in error:', e.code, e.message, e);
      toast(friendlyError(e.code), 'error');
    }
  });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value.trim();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Please wait…';
    try {
      if (mode === 'signup') {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        if (name) await cred.user.updateProfile({ displayName: name });
      } else {
        await firebase.auth().signInWithEmailAndPassword(email, password);
      }
      window.location.replace('/');
    } catch (err) {
      toast(friendlyError(err.code), 'error');
      btn.disabled = false;
      btn.textContent = original;
    }
  });
});
