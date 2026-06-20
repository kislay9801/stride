import { run, ready } from './database.js';

// Seeds the demo dataset. Safe to re-run: wipes existing rows first.
export async function seed() {
  await ready();

  for (const t of ['daily_focus', 'mastery', 'summaries', 'quizzes', 'flashcards', 'notebooks', 'tasks', 'assignments', 'users']) {
    await run(`DELETE FROM ${t}`);
  }

  await run(
    `INSERT INTO users (id, name, avatar_url, cognitive_load, ai_insight) VALUES (1, ?, ?, ?, ?)`,
    [
      'Alex',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBLBz5KzDjDJ_vbnwic6K3rh9sTv-8EUcDncQFW2-uYubG5aGf_zG_5MDCE6qB1s7r71v7PZZCoBEK54Uw2t0B3VzQSCeTWJoBgkheuIhVfcWU8SQES7YtN_6c_rFvW44WhGJqVEEWPxz427Ns13ZUYRuROH40w_zodJYFdYGiVMNC58Ex0GaQlsKlJ7Y9czPpFO6YnoUWKa3u6RMX6vOD6Eaf9pda1e8aPZVSJRKLkXs8Hc4DMEFIIR0h5y-lYuluH0sw4I6Az65Er',
      72,
      'You typically peak in cognitive speed between 10 AM and 12 PM. Consider shifting your Advanced Physics review to this window tomorrow.',
    ]
  );

  const today = new Date().toISOString().slice(0, 10);
  const insTask = (t) =>
    run(
      `INSERT INTO tasks (user_id, assignment_id, title, description, icon, status, date, start_time, end_time, estimate_hours, spent_hours, due_date, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, t.assignment_id ?? null, t.title, t.description, t.icon ?? 'task_alt', t.status, t.date ?? null,
       t.start_time ?? null, t.end_time ?? null, t.estimate_hours ?? 0, t.spent_hours ?? 0, t.due_date ?? null, t.sort_order]
    );

  // Dashboard timeline tasks
  const timeline = [
    { title: 'Review Notes', description: 'Go over yesterday’s lecture notes.', icon: 'done', status: 'done', start_time: '08:00 AM', end_time: '09:30 AM', date: today, sort_order: 0 },
    { title: 'Calculus Quiz', description: 'Timed quiz on integration techniques.', icon: 'play_arrow', status: 'active', start_time: '11:30 AM', end_time: 'Current', date: today, sort_order: 1 },
    { title: 'AI Synthesis', description: 'Generate study materials from notes.', icon: 'psychology', status: 'upcoming', start_time: '02:00 PM', end_time: '03:30 PM', date: today, sort_order: 2 },
    { title: 'Study Group', description: 'Meet with the physics study group.', icon: 'group', status: 'upcoming', start_time: '05:00 PM', end_time: '06:30 PM', date: today, sort_order: 3 },
  ];
  for (const t of timeline) await insTask(t);

  // Assignment + roadmap
  const assignmentId = (
    await run(
      `INSERT INTO assignments (user_id, title, primary_goal, estimated_effort_hours) VALUES (1, ?, ?, ?)`,
      ['Modernist Architecture Essay', 'Critical Analysis of Modernist Architecture Principles', 14.5]
    )
  ).lastInsertRowid;

  const roadmap = [
    { title: 'Topic Selection & Pre-research', description: 'Identify three key architects and collect initial source materials.', status: 'done', estimate_hours: 2, spent_hours: 2, due_date: 'Oct 10', sort_order: 0 },
    { title: 'Literature Review & Core Thesis', description: 'Synthesize findings from 5 peer-reviewed journals into a coherent 250-word thesis statement.', status: 'active', estimate_hours: 3.5, due_date: 'Oct 12', sort_order: 1 },
    { title: 'Drafting Section 1: History', description: 'Write the first 1,000 words focusing on historical context and early influences.', status: 'upcoming', estimate_hours: 4, due_date: 'Oct 15', sort_order: 2 },
    { title: 'Final Review & Citations', description: 'Check formatting against APA 7 standards and perform a final proofread.', status: 'upcoming', estimate_hours: 2, due_date: 'Oct 18', sort_order: 3 },
  ];
  for (const t of roadmap) await insTask({ ...t, assignment_id: assignmentId });

  // Notebook + study materials
  const notebookId = (
    await run(
      `INSERT INTO notebooks (user_id, title, content, tags, pages) VALUES (1, ?, ?, ?, ?)`,
      [
        'Organic Chemistry Fundamentals',
        'Introduction to Carbon Chains and Functional Groups. The reactivity of organic molecules is largely determined by their functional groups.\n\nAlkanes are saturated hydrocarbons consisting only of single-bonded carbon and hydrogen atoms.',
        JSON.stringify(['#chemistry', '#finals']),
        14,
      ]
    )
  ).lastInsertRowid;

  await run(`INSERT INTO flashcards (notebook_id, label, front, back) VALUES (?, ?, ?, ?)`,
    [notebookId, 'Concept', 'Chiral Center', 'An atom that has four different groups bonded to it in such a manner that it has a non-superimposable mirror image.']);
  await run(`INSERT INTO flashcards (notebook_id, label, front, back) VALUES (?, ?, ?, ?)`,
    [notebookId, 'IUPAC Rule', 'Alcohol Suffix', 'Change the ending of the parent alkane from -e to -ol.']);

  await run(`INSERT INTO quizzes (notebook_id, title, description, duration_min, questions) VALUES (?, ?, ?, ?, ?)`,
    [notebookId, 'Functional Groups Quiz', 'Test your knowledge on naming and identifying common organic functional groups.', 10,
      JSON.stringify([
        { question: 'Which functional group is characterized by an -OH attached to a carbon?', options: ['Aldehyde', 'Alcohol', 'Ketone', 'Ether'], answerIndex: 1, explanation: 'A hydroxyl (-OH) group bonded to carbon defines an alcohol.' },
        { question: 'The suffix "-al" in IUPAC nomenclature indicates which group?', options: ['Carboxylic acid', 'Ketone', 'Aldehyde', 'Ester'], answerIndex: 2, explanation: 'Aldehydes take the "-al" suffix (e.g. ethanal).' },
      ])]);

  await run(`INSERT INTO summaries (notebook_id, title, body, read_time) VALUES (?, ?, ?, ?)`,
    [notebookId, 'Executive Summary: Alkanes', 'Alkanes are the simplest family of organic compounds, consisting entirely of single-bonded carbon and hydrogen atoms. They serve as the backbone for more complex molecules and are relatively unreactive.', '3 min read']);
  await run(`INSERT INTO summaries (notebook_id, title, body, read_time) VALUES (?, ?, ?, ?)`,
    [notebookId, 'Reaction Mechanisms Cheat Sheet', 'A concise breakdown of SN1, SN2, E1, and E2 mechanisms including solvent effects, stereochemistry, and rate laws.', '5 min read']);

  await run(`INSERT INTO mastery (user_id, subject, percent) VALUES (1, ?, ?)`, ['Organic Chemistry', 68]);
  await run(`INSERT INTO mastery (user_id, subject, percent) VALUES (1, ?, ?)`, ['Molecular Biology', 42]);

  for (const [wd, idx, hrs] of [['M', 0, 6], ['T', 1, 8], ['W', 2, 7], ['T', 3, 5], ['F', 4, 9], ['S', 5, 2.5], ['S', 6, 2]]) {
    await run(`INSERT INTO daily_focus (user_id, weekday, day_index, hours) VALUES (1, ?, ?, ?)`, [wd, idx, hrs]);
  }

  console.log('Seeded Stride demo data.');
}

// Allow `node backend/db/seed.js` to reseed from the CLI.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/db/seed.js')) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
