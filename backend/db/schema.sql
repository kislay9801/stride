-- Stride schema. Single-user demo app, so most tables hang off user_id = 1.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT,
  firebase_uid  TEXT,                            -- NULL for the demo user
  avatar_url    TEXT,
  cognitive_load INTEGER NOT NULL DEFAULT 50,   -- 0..100 current capacity
  ai_insight    TEXT
);
-- NOTE: the unique index on firebase_uid is created in database.js, AFTER the
-- migration guarantees the column exists on pre-existing databases.

-- Assignments are the "Assignment Breakdown" roadmaps.
CREATE TABLE IF NOT EXISTS assignments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL,
  title               TEXT NOT NULL,
  primary_goal        TEXT,
  estimated_effort_hours REAL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tasks power both the Dashboard timeline and the Assignment roadmaps.
-- A task with assignment_id is a roadmap step; a task with a time slot shows on the timeline.
CREATE TABLE IF NOT EXISTS tasks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  assignment_id INTEGER,
  title         TEXT NOT NULL,
  description   TEXT,
  icon          TEXT DEFAULT 'task_alt',
  status        TEXT NOT NULL DEFAULT 'upcoming', -- done | active | upcoming
  date          TEXT,            -- YYYY-MM-DD for timeline grouping
  start_time    TEXT,            -- e.g. "08:00 AM"
  end_time      TEXT,            -- e.g. "09:30 AM"
  estimate_hours REAL DEFAULT 0,
  spent_hours   REAL DEFAULT 0,
  due_date      TEXT,            -- human label e.g. "Oct 12"
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notebooks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT,
  tags        TEXT DEFAULT '[]',   -- JSON array
  pages       INTEGER DEFAULT 1,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS flashcards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id INTEGER NOT NULL,
  label       TEXT,                -- small uppercase tag e.g. "Concept"
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  duration_min INTEGER DEFAULT 10,
  questions   TEXT DEFAULT '[]',   -- JSON: [{question, options[], answerIndex, explanation}]
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS summaries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id INTEGER NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read_time   TEXT DEFAULT '3 min read',
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mastery (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  subject   TEXT NOT NULL,
  percent   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- One row per weekday for the "Weekly Impact" bar chart.
CREATE TABLE IF NOT EXISTS daily_focus (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  weekday   TEXT NOT NULL,          -- M T W T F S S (label)
  day_index INTEGER NOT NULL,       -- 0..6 for ordering
  hours     REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
