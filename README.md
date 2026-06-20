# Stride — Calm AI Study App

Stride turns your notes and assignments into a focused, AI-assisted study workflow. It's a
single full-stack app: an **Express + SQLite** backend serving a **vanilla JS + Tailwind**
frontend, with **Google Gemini** powering the AI features and **optional Firebase Auth**
(Google + email/password).

> **Auth is optional.** With no Firebase config the app runs in **demo mode** — no login, a
> single seeded user. Add your Firebase keys and it becomes a real multi-user app where each
> account signs in and gets its own (initially empty) data.

## Features

| Page | What it does |
|------|--------------|
| **Dashboard** (`/`) | Daily timeline (mark tasks complete), cognitive-load ring, weekly focus chart, AI insight you can regenerate, and an "add task" button. |
| **Assignment Breakdown** (`/assignments.html`) | Paste a brief or upload a file → Gemini deconstructs it into an ordered roadmap with effort estimates and due dates. Toggle steps done/open; progress updates live. |
| **Revision Hub** (`/revision.html`) | Edit notebooks, then generate **flashcards** (flip them), **quizzes** (interactive, scored), and **summaries** from your notes via Gemini. Tracks subject mastery. |
| **AI Tutor** (`/tutor.html`) | A chat companion (Gemini) that explains concepts, quizzes you, and helps plan study sessions — with light context about what you're studying. |
| **Settings** (`/settings.html`) | Edit your display name, toggle **dark mode**, and sign out. |
| **Sign in / Sign up** (`/login.html`) | Google or email/password (only used when Firebase is configured). |

Plus a working **global search** (top bar) across tasks, notebooks, and assignments.

## Tech stack

- **Backend:** Node.js + Express (ESM)
- **Database:** SQLite via `@libsql/client` — a local file in dev, **Turso** (cloud SQLite) in production
- **AI:** Google Gemini REST API (`gemini-2.0-flash` by default)
- **Auth:** Firebase Authentication (optional) — `firebase-admin` verifies ID tokens server-side
- **Frontend:** static HTML + Tailwind (Play CDN) + vanilla JS — no build step

## Run it locally

### 1. Prerequisites
- **Node.js 18+** (developed on Node 20). Check with `node --version`.

### 2. Install
```bash
npm install
```

### 3. Configure your environment
Copy the example env file and (optionally) add a Gemini key:
```bash
# macOS/Linux
cp .env.example .env
# Windows (PowerShell)
copy .env.example .env
```
Then edit `.env`:
```ini
GEMINI_API_KEY=your_key_here      # get one at https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-2.0-flash     # optional
PORT=3000                         # optional
```
> **No key?** The app still runs and all non-AI features work. AI buttons return a clear
> "configure your key" message instead of crashing.

### 4. Start the server
```bash
npm start
# or, auto-restart on file changes:
npm run dev
```
Open **http://localhost:3000**.

In **demo mode** the database auto-seeds sample data on first launch (a sample assignment,
notebook, flashcards, quiz, timeline, and mastery stats) so no screen is ever empty. This is
why you'll see "Alex" and a 72% cognitive load before adding auth — it's placeholder data, not
a real account.

## Enabling login (Firebase Auth) — optional

Skip this to stay in demo mode. To turn on real Google + email/password accounts:

1. **Create a Firebase project** at <https://console.firebase.google.com>.
2. **Add a Web app** (Project settings → *Your apps* → Web) and copy its `firebaseConfig`
   into [`frontend/assets/firebase-config.js`](frontend/assets/firebase-config.js), replacing
   the `YOUR_*` placeholders.
3. **Enable sign-in methods**: Authentication → Sign-in method → enable **Email/Password** and
   **Google**.
4. **Add a service account** so the backend can verify tokens (Project settings →
   *Service accounts* → Generate new private key). Either:
   - save the downloaded file as `serviceAccountKey.json` in the project root, **or**
   - paste its values into `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` /
     `FIREBASE_PRIVATE_KEY` in `.env` (see `.env.example`).
5. Restart the server. You'll see `Firebase Admin: using serviceAccountKey.json` on boot.

Once enabled, visiting any page redirects to `/login.html` until you sign in, and **each new
account starts with a clean slate** (no fake stats). The demo user is never shown to real users.

> Both `.env` and `serviceAccountKey.json` are git-ignored — keep your keys out of version control.

## Deployment (Vercel + Turso)

The app runs as a Vercel serverless function ([api/index.js](api/index.js) wraps the Express
app via [vercel.json](vercel.json)) backed by **Turso** (persistent cloud SQLite).

1. **Create a Turso DB** at [app.turso.tech](https://app.turso.tech) → copy its **Database URL**
   and create an **auth token**.
2. **Import the repo into Vercel** (New Project → pick the GitHub repo).
3. In **Vercel → Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `GEMINI_API_KEY`, `GEMINI_MODEL`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (for auth)
4. **Deploy.** The schema is created automatically on first request.
5. Add your Vercel URL to **Firebase → Authentication → Authorized domains** so Google sign-in
   works in production.

Locally, leave `TURSO_*` blank in `.env` to use a local SQLite file instead.

### Reset the demo data
```bash
npm run seed
```
This wipes and re-seeds the database. (To start fully fresh instead, delete the `data/` folder.)

## Project structure

```
stride/
├─ package.json
├─ .env.example          # copy to .env
├─ api/
│  └─ index.js           # Vercel serverless entry (exports the Express app)
├─ vercel.json           # Vercel build/route config
├─ backend/
│  ├─ app.js             # builds the Express app (API + static), DB bootstrap
│  ├─ server.js          # local dev entry (app.listen)
│  ├─ db/
│  │  ├─ schema.sql      # tables
│  │  ├─ database.js     # libsql client (Turso/file) + async helpers + migrations
│  │  └─ seed.js         # demo data (also `npm run seed`)
│  ├─ services/
│  │  ├─ gemini.js       # Gemini REST wrapper (generate / generateJSON / chat)
│  │  ├─ firebase.js     # Firebase Admin init (optional) + token verification
│  │  └─ auth.js         # auth middleware → resolves req.userId, provisions new users
│  └─ routes/
│     ├─ dashboard.js    # GET /api/dashboard, POST /api/dashboard/insight
│     ├─ tasks.js        # PATCH/POST /api/tasks
│     ├─ assignments.js  # GET/POST/DELETE + POST /api/assignments/breakdown
│     ├─ notebooks.js    # notebooks + /generate (flashcards|quizzes|summaries)
│     ├─ tutor.js        # POST /api/tutor/chat
│     └─ account.js      # GET/PATCH /api/me, GET /api/search
├─ frontend/
│  ├─ index.html         # Dashboard
│  ├─ assignments.html · revision.html · tutor.html
│  ├─ login.html · settings.html
│  ├─ assets/            # theme.js, common.js, auth.js, firebase-config.js + one script/page
│  └─ pages/             # original static design mockups (reference only)
├─ serviceAccountKey.json # (optional, you add it) Firebase Admin creds — git-ignored
└─ data/                 # SQLite db (git-ignored, created at runtime)
```

## API reference (quick)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Status + whether Gemini key and Firebase auth are configured |
| GET | `/api/me` | Current user profile + whether auth is enabled |
| PATCH | `/api/me` | Update display name |
| GET | `/api/search?q=` | Search the user's tasks, notebooks, assignments |
| GET | `/api/dashboard` | All dashboard data in one payload |
| POST | `/api/dashboard/insight` | Regenerate the AI insight *(AI)* |
| POST | `/api/tasks` | Create a timeline task |
| PATCH | `/api/tasks/:id` | Update task `status` / `spent_hours` |
| GET | `/api/assignments` | List assignments + roadmaps |
| POST | `/api/assignments/breakdown` | Brief (JSON `brief` or multipart `file`) → roadmap *(AI)* |
| DELETE | `/api/assignments/:id` | Delete an assignment |
| GET | `/api/notebooks` | Notebooks + mastery |
| PATCH | `/api/notebooks/:id` | Update notebook title/content/tags |
| POST | `/api/notebooks/:id/generate` | `{type: flashcards\|quizzes\|summaries}` *(AI)* |
| POST | `/api/notebooks/:id/flashcards` | Add a card manually |
| POST | `/api/tutor/chat` | `{messages:[{role,text}]}` → tutor reply *(AI)* |

All `/api` routes (except `/api/health`) run through auth: in demo mode they resolve to the
seeded user; with Firebase enabled they require a valid `Authorization: Bearer <idToken>` and
return **401** otherwise. Endpoints marked *(AI)* additionally require `GEMINI_API_KEY` and
return **503** with a helpful message if AI isn't available (e.g. missing key or quota reached).

## Notes & limitations
- Uploaded files are read as UTF-8 text, so **`.txt` / `.md` work best**. PDFs/Word docs are
  accepted but their text may not extract cleanly — pasting the brief text is most reliable.
- **Gemini free-tier quota** is small; if AI actions show "rate limit / quota reached", that's a
  billing/quota limit on your Google key, not a bug — check
  <https://ai.google.dev/gemini-api/docs/rate-limits>.
- **Node 20.x note:** `firebase-admin` is pinned to v12 because v13+ pulls an ESM-only `jose`
  that Node 20's `require()` can't load. v12 is fully compatible.
- Dark mode overrides the main surfaces/text; the teal accent palette is shared across themes.
- Tailwind is loaded from the Play CDN for zero-build simplicity (not optimized for production).
