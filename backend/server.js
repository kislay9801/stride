// Local development entry point. (On Vercel, api/index.js is used instead.)
import app from './app.js';
import { hasGeminiKey } from './services/gemini.js';
import { isAuthEnabled } from './services/firebase.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  Stride running at http://localhost:${PORT}`);
  console.log(`  Gemini AI: ${hasGeminiKey() ? 'configured ✓' : 'no key (AI features will prompt for a key)'}`);
  console.log(`  Auth: ${isAuthEnabled() ? 'Firebase enabled ✓' : 'demo mode'}\n`);
});
