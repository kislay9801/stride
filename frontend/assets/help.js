/* Help page: just needs the shell avatar populated. */
document.addEventListener('DOMContentLoaded', () => {
  api.get('/me').then((d) => setShellAvatar(d.user.avatar_url)).catch(() => {});
});
