/* Shared auth layer for all pages.
   - Detects whether Firebase is configured (real keys vs placeholders).
   - In demo mode: does nothing, app works without login.
   - In auth mode: initializes Firebase, exposes token getter + sign-out,
     and gates protected pages (redirects to /login.html when signed out).

   Exposes a global `window.Stride`. Loads BEFORE common.js + page scripts. */
(function () {
  const cfg = window.STRIDE_FIREBASE_CONFIG || {};
  const looksPlaceholder = !cfg.apiKey || /^YOUR_|XXXX/.test(cfg.apiKey);
  const firebaseLoaded = typeof firebase !== 'undefined';
  const authEnabled = !looksPlaceholder && firebaseLoaded;

  let currentUser = null;
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  if (authEnabled) {
    firebase.initializeApp(cfg);
    firebase.auth().onAuthStateChanged((user) => {
      currentUser = user;
      resolveReady();
    });
  } else {
    resolveReady();
  }

  const isLoginPage = /\/login\.html$/.test(window.location.pathname);

  // Gate: protected pages require a signed-in user; login page bounces if already in.
  // In demo mode there's no gating at all, and the login page stays viewable
  // (login.js shows a "demo mode" banner) so it can be previewed.
  if (authEnabled) {
    ready.then(() => {
      if (!currentUser && !isLoginPage) {
        window.location.replace('/login.html');
      } else if (currentUser && isLoginPage) {
        window.location.replace('/');
      }
    });
  }

  window.Stride = {
    authEnabled,
    ready,
    getUser: () => currentUser,
    async getToken() {
      if (!authEnabled) return null;
      await ready;
      return currentUser ? currentUser.getIdToken() : null;
    },
    async signOut() {
      if (authEnabled) await firebase.auth().signOut();
      window.location.replace('/login.html');
    },
  };
})();
