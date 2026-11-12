import type { QuizQuestion } from "./types";

const STOP = new Set(
  "the a an and or of to in on for with from by as is are was were be been being this that these those it its at into over after before about than then so if not no yes you your we they their his her she he i my our but which who what when where how why can could would should may might will just only also more most other per via using used use such than have has had not from into onto upon within without between among while during because although however therefore thus there here very much many some any each every both few own same other another first second third one two three four five".split(
    " ",
  ),
);

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function groupLabel(ts: number): "Today" | "Yesterday" | "Older" {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = start(new Date()) - start(new Date(ts));
  if (diff <= 0) return "Today";
  if (diff === 86400000) return "Yesterday";
  return "Older";
}

export function formatWhen(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hashPick<T>(items: T[], n: number, seed: string): T[] {
  const copy = [...items];
  let h = 0;
  for (const ch of seed) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const out: T[] = [];
  while (copy.length && out.length < n) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const i = h % copy.length;
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function keywords(sentence: string): string[] {
  return Array.from(
    new Set(
      sentence
        .replace(/[^A-Za-z'-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4 && !STOP.has(w.toLowerCase())),
    ),
  );
}

export function quizFromText(text: string, exclude: string[] = []): QuizQuestion[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 24 && value.length <= 260 && /[A-Za-z]/.test(value))
    .filter((value) => !exclude.some((old) => value.toLowerCase().startsWith(old.slice(0, 28).toLowerCase())));
  const pool = sentences.map((value) => ({ s: value, keys: keywords(value) })).filter((x) => x.keys.length > 0);
  const allKeys = Array.from(new Set(pool.flatMap((p) => p.keys)));
  const prompts = [
    "According to the notes, which statement is true?",
    "Which of these statements is supported by the notes?",
    "Which statement matches what the source says?",
    "Which of the following is stated in the notes?",
    "Which statement is the source most consistent with?",
    "Which of these statements does the source agree with?",
    "Which statement can you find, almost word for word, in the notes?",
    "Which of these is the notes' exact claim?",
    "Which statement agrees with the notes?",
    "Which one of these statements did the source make?",
  ];
  const questions: QuizQuestion[] = [];
  const usedSentences = new Set<string>();

  // Prefer distinct source sentences; for short notes, add keyword variants of
  // the same sentence (different swapped word) so ten fair questions still
  // exist. Options are always complete sentences, never word blanks.
  const targets: { s: string; key: string }[] = [];
  for (const item of pool) {
    if (targets.length >= 10) break;
    targets.push({ s: item.s, key: item.keys[0] });
  }
  for (const item of pool) {
    if (targets.length >= 10) break;
    for (const key of item.keys) {
      if (targets.length >= 10) break;
      if (targets.some((t) => t.s === item.s && t.key === key)) continue;
      targets.push({ s: item.s, key });
    }
  }

  for (const target of targets) {
    if (questions.length >= 10) break;
    const sentence = target.s;
    const key = target.key;
    if (!key) continue;
    if (usedSentences.has(sentence) && questions.length >= 1) {
      const repeats = usedSentences.size;
      const distinct = sentences.filter((s2) => !usedSentences.has(s2)).length;
      if (distinct > 0 && repeats > 3) continue;
    }
    usedSentences.add(sentence);
    const distractorPool = allKeys.filter((k) => k.toLowerCase() !== key.toLowerCase());
    if (distractorPool.length < 3) continue;
    const picks = hashPick(distractorPool, 3, key + sentence + questions.length);
    const wrongs = picks.map((k) => sentence.replace(new RegExp(`\\b${escapeReg(key)}\\b`, "i"), k));
    if (new Set(wrongs).size !== 3 || wrongs.includes(sentence)) continue;
    const options = hashPick([sentence, ...wrongs], 4, "opt" + sentence + questions.length);
    const answer = options.findIndex((o) => o === sentence);
    if (answer < 0 || new Set(options).size !== 4) continue;
    questions.push({
      question: prompts[questions.length % prompts.length],
      options,
      answer,
      explanation: `The notes say: “${sentence}”`,
    });
  }

  return questions.slice(0, 10);
}

export type SubjectHours = { name: string; hours: number };

export function parseSubjects(raw: string): SubjectHours[] {
  const parts = raw
    .split(/[,;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: SubjectHours[] = [];
  for (const part of parts) {
    const match = part.match(/^(.*?)(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours)?$/i);
    if (match && match[1].trim()) {
      out.push({ name: match[1].trim(), hours: Math.max(0.5, Math.min(20, Number(match[2]))) });
    } else if (part) {
      out.push({ name: part.replace(/\d+/g, "").trim() || part, hours: 2 });
    }
  }
  return out.slice(0, 8);
}

export function buildTimetable(subjects: SubjectHours[]): { day: string; blocks: { time: string; title: string; note: string }[] }[] {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sessions: { title: string; minutes: number; note: string }[] = [];
  for (const subject of subjects) {
    let left = Math.round(subject.hours * 60);
    while (left > 0) {
      const minutes = left >= 80 ? 50 : left >= 40 ? 40 : 25;
      sessions.push({
        title: subject.name,
        minutes,
        note: minutes >= 50 ? "Deep work, then a 10 minute break" : "Short retrieval practice",
      });
      left -= minutes;
    }
  }
  if (sessions.length === 0) {
    sessions.push({ title: "Review", minutes: 40, note: "Add subjects to build a fuller week" });
  }
  const plan = days.map((day) => ({ day, blocks: [] as { time: string; title: string; note: string }[] }));
  const startHour = [16, 16, 16, 16, 16, 10, 11];
  sessions.forEach((session, index) => {
    const dayIndex = index % 7;
    const blockCount = plan[dayIndex].blocks.length;
    const minutes = startHour[dayIndex] * 60 + blockCount * 70;
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    const end = minutes + session.minutes;
    const label = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}–${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
    plan[dayIndex].blocks.push({ time: label, title: session.title, note: session.note });
  });
  plan[6].blocks.push({ time: "18:00–18:25", title: "Weekly review", note: "What stuck, what to retry next week" });
  return plan;
}

export function timetableToIcs(plan: { day: string; blocks: { time: string; title: string; note: string }[] }[]): string {
  const dayIndex: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const now = new Date();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sage//Study Planner//EN"];
  for (const day of plan) {
    for (const block of day.blocks) {
      const match = block.time.match(/(\d{2}):(\d{2})/);
      if (!match) continue;
      const date = new Date(now);
      const delta = (dayIndex[day.day] - date.getDay() + 7) % 7;
      date.setDate(date.getDate() + delta);
      date.setHours(Number(match[1]), Number(match[2]), 0, 0);
      const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      lines.push("BEGIN:VEVENT", `DTSTART:${stamp}`, `SUMMARY:${block.title}`, `DESCRIPTION:${block.note}`, "END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildTutoringPlan(goal: string): { session: number; title: string; aim: string; prompts: string[] }[] {
  const phases = [
    ["Diagnose", "Find what you already know and where the fog is.", ["What part of this goal can you already explain?", "What word in the goal is still vague?"]],
    ["Map the idea", "Break the goal into pieces you can practice.", ["What are three smaller skills inside this goal?", "Which piece unlocks the others?"]],
    ["Worked example", "Watch one example and narrate each move.", ["Why does that step come next?", "What would a wrong step look like here?"]],
    ["You try", "Attempt a similar problem with questions, not answers.", ["What is given, and what is asked?", "What is a smaller case of the same idea?"]],
    ["Error clinic", "Study one mistake until the pattern is visible.", ["What did you assume that the problem never said?", "How would you catch this next time?"]],
    ["Teach-back", "Explain the idea aloud without notes.", ["Where did you hesitate?", "What question would a classmate ask you?"]],
    ["Mixed practice", "Mix old and new so memory has to retrieve.", ["Which earlier idea showed up again?", "What cue told you which tool to use?"]],
    ["Independent check", "Try a fresh item and grade your reasoning.", ["Did you answer the question that was asked?", "What will you practice next session?"]],
  ];
  return phases.map(([title, aim, prompts], i) => ({
    session: i + 1,
    title: String(title),
    aim: `${aim} Goal: ${goal}`,
    prompts: prompts as string[],
  }));
}

export function buildAppReport(): string {
  return [
    "Sage — Product Report",
    "",
    "Overview",
    "Sage is a Socratic study room. It teaches how to think, not what to think. The product combines a study chat, writing pad, research trail, a full-book library, quiz studio, and a planner. Work is saved on this device.",
    "",
    "Who it is for",
    "Curious students who want a tutor that asks better questions, and learners who want their own library, writing pad, and planner in one quiet place.",
    "",
    "What it does",
    "- Ask Sage: a study chat grounded in public sources when a live model is unavailable.",
    "- Explain a concept: a walkthrough, an analogy labeled as an analogy, and a check question.",
    "- Study timetable: a realistic week you can print or add to a calendar.",
    "- Tutoring plan: session-by-session practice built around a learner's goal.",
    "- Quiz from notes: five questions drawn from the learner's own text, auto-graded.",
    "- Homework helper: Socratic questions, not a finished answer.",
    "- Writing Pad: structured documents with hints, a structure check, and PDF export.",
    "- Research Trail: sources, a summary, and follow-up questions.",
    "- Library: Project Gutenberg books, readable cover to cover, downloadable for offline.",
    "- Socratic tutor: work mode asks questions and gives hints, never the final answer.",
    "",
    "How to share",
    "Edit this report in the writing pad, or export it as a PDF to share.",
    "",
    "Notes",
    "Nothing in Sage should be treated as a fabricated citation. If a source cannot be reached, the product says so.",
  ].join("\n");
}

export const TEMPLATE_META: Record<string, { title: string; sections: string[]; hints: string[] }> = {
  lab: {
    title: "Lab Report",
    sections: ["Abstract", "Introduction", "Hypothesis", "Methods", "Results", "Discussion", "Conclusion", "References"],
    hints: [
      "What was your hypothesis — and what result would have surprised you?",
      "Which variable did you change, and which did you hold still?",
      "What did you actually observe, before you explain why?",
      "Which result does not fit the tidy story?",
    ],
  },
  field: {
    title: "Field Report",
    sections: ["Site", "Date and conditions", "Observations", "Data", "Interpretation", "Limitations", "Next steps"],
    hints: [
      "Where were you standing, and what could you not see from there?",
      "What did you record first, before you decided what it meant?",
      "What condition (weather, time, noise) might have changed the observation?",
    ],
  },
  reflection: {
    title: "Reflection Journal",
    sections: ["What happened", "What I felt", "What I learned", "What I will try", "Questions still open"],
    hints: [
      "What happened, in the order it happened, without the moral yet?",
      "What feeling showed up, and what thought was attached to it?",
      "What is one small thing you will try next time?",
    ],
  },
  argument: {
    title: "Argumentative Essay",
    sections: ["Claim", "Context", "Reasons", "Evidence", "Counterargument", "Rebuttal", "Conclusion"],
    hints: [
      "Can you state the claim in one sentence a critic could disagree with?",
      "What is the strongest objection a fair reader would raise?",
      "Which piece of evidence would still matter if your favorite quote disappeared?",
    ],
  },
  free: {
    title: "Free write",
    sections: ["Opening", "Middle", "Ending"],
    hints: ["What is the one idea this piece cannot lose?", "Where are you telling instead of showing the reasoning?"],
  },
};

export function checkStructure(template: string, content: string): { present: string[]; missing: string[] } {
  const sections = TEMPLATE_META[template]?.sections ?? TEMPLATE_META.free.sections;
  const lower = content.toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];
  for (const section of sections) {
    if (lower.includes(section.toLowerCase())) present.push(section);
    else missing.push(section);
  }
  return { present, missing };
}

export function ownWorkHint(): string {
  return "This is a self-check, not a database scan. Read each paragraph aloud. If you cannot explain a sentence without looking back, mark it and rewrite it in your own words. List every source you relied on under References. If a sentence still sounds like someone else, it is not finished.";
}

export function socraticHint(topic: string): string {
  const hints = [
    `Look at the smallest piece of “${topic}”. What is one thing you know for certain?`,
    "What would a correct answer have to do — not what the answer is?",
    "Try a number, a drawing, or a simpler case. What changes, and what stays?",
    "Which word in the question is doing the most work? Define that word first.",
    "What would a wrong answer assume that the problem never said?",
  ];
  return hints[Math.floor(Date.now() / 1000) % hints.length];
}

export function homeworkPrompts(excerpt: string): string {
  const clip = excerpt.replace(/\s+/g, " ").trim().slice(0, 280);
  return [
    "I will not hand you the finished answer. We will walk it.",
    "",
    clip ? `Here is a piece of what you attached: “${clip}”` : "I don't have readable text yet. Tell me the question in your own words.",
    "",
    "1. What is the question actually asking you to find or decide?",
    "2. What information is given, and what is missing?",
    "3. What is a smaller version of the same problem?",
    "4. What have you already tried, and where did it stall?",
    "",
    "Answer 1 in a sentence. Then ask for a hint if you want a nudge, not the solution.",
  ].join("\n");
}
