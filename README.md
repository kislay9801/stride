# Stride — Calm AI Study App

Stride turns your notes and assignments into a focused, AI-assisted study workflow. It's a
single full-stack app: an **Express + SQLite/Turso** backend serving a **vanilla JS + Tailwind**
frontend, with **Google Gemini** powering the AI features and **optional Firebase Auth**
(Google + email/password). Fully responsive — works on desktop and mobile.

> **Auth is optional.** With no Firebase config the app runs in **demo mode** — no login, a
> single seeded user. Add your Firebase keys and it becomes a real multi-user app where each
> account signs in and gets its own (initially empty) data.

## Features

| Page | What it does |
|------|--------------|
| **Dashboard** (`/`) | Daily timeline — add tasks via a modal (title, time, icon), mark them done, or delete them. A **cognitive-load** ring that's computed from your real workload (rises with pending work, falls as you finish it), a weekly focus chart, and a regenerating **AI insight**. |
| **Assignment Breakdown** (`/assignments.html`) | Paste a brief or upload a **PDF/text file** (text is extracted in your browser) → Gemini builds an ordered roadmap with effort estimates and due dates. Add, edit, complete, or delete steps; completing the active step auto-advances the next; progress updates live. |
| **Revision Hub** (`/revision.html`) | Create a notebook and paste notes → one click generates **5 flashcards** (flip them), a **10-question quiz** (interactive, scored), and **3–4 summaries** — all at once. Add cards by hand too. Tracks subject mastery. |
| **AI Tutor** (`/tutor.html`) | A chat companion (Gemini) that explains concepts, quizzes you, and helps plan study sessions — with light context about what you're studying. |
| **Settings** (`/settings.html`) | Edit your display name, toggle **dark mode**, and sign out. |
| **Help** (`/help.html`) | A short guide to every feature. |
| **Sign in / Sign up** (`/login.html`) | An intro/landing page with Google or email/password sign-in (used when Firebase is configured). |

Plus a **global search** and a **notification bell** with task reminders, both in the top bar.

## Tech stack

- **Backend:** Node.js + Express (ESM)
- **Database:** SQLite via `@libsql/client` — a local file in dev, **Turso** (cloud SQLite) in production
- **AI:** Google Gemini REST API (default model `gemini-2.5-flash-lite`)
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
Copy the example env file and add a Gemini key:
```bash
# macOS/Linux
cp .env.example .env
# Windows (PowerShell)
copy .env.example .env
```
Then edit `.env`:
```ini
GEMINI_API_KEY=your_key_here          # get one at https://aistudio.google.com/app/apikey
GEMINI_MODEL=gemini-2.5-flash-lite    # pick a model your key has quota for
PORT=3000                             # optional
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
notebook, flashcards, quiz, timeline, and mastery stats) so no screen is ever empty — that's
why you'll see "Alex" before adding auth. It's placeholder data, not a real account.

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
5. Restart the server. You'll see `Firebase Admin: using …` on boot, and `/api/health` reports
   `authEnabled: true`.

Once enabled, visiting any page redirects to `/login.html` until you sign in, and **each new
account starts with a clean slate** (no fake stats). The demo user is never shown to real users.

> Both `.env` and `serviceAccountKey.json` are git-ignored — keep your keys out of version control.
> (The Firebase *web* config in `firebase-config.js` is a public client identifier and is safe to commit.)

## Deployment (Vercel + Turso)

The app runs as a Vercel serverless function ([api/index.js](api/index.js) wraps the Express
app via [vercel.json](vercel.json)) backed by **Turso** (persistent cloud SQLite).

1. **Create a Turso DB** at [app.turso.tech](https://app.turso.tech) → copy its **Database URL**
   and create an **auth token** (both can be done from the website).
2. **Import the repo into Vercel** (New Project → pick the GitHub repo).
3. In **Vercel → Settings → Environment Variables**, add:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `GEMINI_API_KEY`, `GEMINI_MODEL`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (for auth)
4. **Deploy.** The schema is created automatically on first request.
5. Add your `*.vercel.app` URL to **Firebase → Authentication → Authorized domains** so Google
   sign-in works in production.

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
├─ vercel.json           # Vercel build/route config
├─ api/
│  └─ index.js           # Vercel serverless entry (exports the Express app)
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
│     ├─ dashboard.js    # dashboard payload + cognitive load + AI insight
│     ├─ tasks.js        # create / edit / delete tasks; roadmap auto-advance
│     ├─ assignments.js  # assignments, AI breakdown, add steps
│     ├─ notebooks.js    # notebooks + /generate (all|flashcards|quizzes|summaries)
│     ├─ tutor.js        # AI tutor chat
│     └─ account.js      # /me, /search, /reminders
├─ frontend/
│  ├─ index.html         # Dashboard
│  ├─ assignments.html · revision.html · tutor.html
│  ├─ login.html · settings.html · help.html
│  ├─ assets/            # theme.js, common.js, auth.js, firebase-config.js + one script/page
│  └─ pages/             # original static design mockups (reference only)
├─ serviceAccountKey.json # (optional, you add it) Firebase Admin creds — git-ignored
└─ data/                 # local SQLite db (git-ignored, created at runtime)
```

## API reference (quick)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Status + whether Gemini key and Firebase auth are configured |
| GET | `/api/me` · PATCH `/api/me` | Current user profile / update display name |
| GET | `/api/search?q=` | Search the user's tasks, notebooks, assignments |
| GET | `/api/reminders` | Today's pending tasks + due assignment steps (notification bell) |
| GET | `/api/dashboard` | All dashboard data (incl. computed cognitive load) |
| POST | `/api/dashboard/insight` | Regenerate a varied AI insight *(AI)* |
| POST | `/api/tasks` | Create a timeline task |
| PATCH | `/api/tasks/:id` | Update status / hours / title / description / estimate / due date |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/assignments` · GET `/api/assignments/:id` | List / fetch assignments + roadmaps |
| POST | `/api/assignments/breakdown` | Brief (`{title, brief}` JSON) → roadmap *(AI)* |
| POST | `/api/assignments/:id/tasks` | Add a step to a roadmap |
| DELETE | `/api/assignments/:id` | Delete an assignment (and its steps) |
| GET | `/api/notebooks` | Notebooks (with materials) + mastery |
| POST `/api/notebooks` · PATCH `/api/notebooks/:id` | Create / update a notebook |
| POST | `/api/notebooks/:id/generate` | `{type: all\|flashcards\|quizzes\|summaries}` *(AI)* |
| POST | `/api/notebooks/:id/flashcards` | Add a card manually |
| POST | `/api/tutor/chat` | `{messages:[{role,text}]}` → tutor reply *(AI)* |

All `/api` routes (except `/api/health`) run through auth: in demo mode they resolve to the
seeded user; with Firebase enabled they require a valid `Authorization: Bearer <idToken>` and
return **401** otherwise. Endpoints marked *(AI)* additionally need a Gemini key and return
**503** with a helpful message if AI is unavailable (missing key or quota reached).

## Notes & limitations
- **PDF uploads** are parsed in the browser (pdf.js) and only the extracted text is sent — this
  avoids upload size limits and gives the AI real content. **Scanned/image-only PDFs** have no
  text layer, so paste the brief instead.
- **Gemini quota:** the free tier is small and per-model. If AI actions show "rate limit / quota
  reached", switch `GEMINI_MODEL` to one with quota (e.g. `gemini-3.1-flash-lite`,
  `gemini-2.5-flash-lite`) or enable billing. See
  <https://ai.google.dev/gemini-api/docs/rate-limits>.
- **Node 20.x note:** `firebase-admin` is pinned to v12 because v13+ pulls an ESM-only `jose`
  that Node 20's `require()` can't load. v12 is fully compatible.
- **Cognitive load** is derived from your current workload (pending tasks + the active step of
  each assignment); future roadmap steps don't count until they become active.
- Dark mode overrides the main surfaces/text; the teal accent palette is shared across themes.
- Tailwind is loaded from the Play CDN for zero-build simplicity (not optimized for production).
