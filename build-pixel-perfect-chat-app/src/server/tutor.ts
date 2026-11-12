import { openRouter } from "./wiki";

export type TutorPhase = "idle" | "awaiting" | "quiz" | "done";

export type TutorState = {
  topic: string;
  phase: TutorPhase;
  asked: number;
  startedAt: number;
};

export const FINISHED_TOPIC = "Great! Let me know if you need anything else.";
export const MAX_QUESTIONS = 15;

const GREETING_RE = /^(hi|hello|hey|hiya|howdy|yo|sup|good\s+(morning|afternoon|evening))\b[!.]*$/i;
const THANKS_RE = /^(thanks|thank you|thx|ty)\b/i;

const GREETING_REPLIES = [
  "Hey! 👋 What do you want to learn today?",
  "Hi! I'm Sage — what shall we explore?",
  "Hello! Ask me about anything you want to understand.",
];

const UNAVAILABLE = "My AI service is not available right this moment. Try sending that again in a few seconds.";

function isGreeting(text: string): boolean {
  const clean = text.trim();
  return clean.length <= 26 && GREETING_RE.test(clean);
}

function lessonSystem(topic: string): string {
  return [
    "You are Sage, a friendly, expert tutor answering like a great modern AI assistant.",
    "",
    "FORMAT RULES — conciseness is mandatory, never write an essay:",
    `- Use Markdown. Start with a short bold heading about ${topic}.`,
    "- Then a SHORT intro: 2 to 3 sentences maximum. No long paragraphs anywhere.",
    "- Then a section '**Main types:**' (or 'Key ideas', 'Main parts' when types do not fit).",
    "- Bullets: 4 to 6 items maximum. Each bullet is ONE sentence: the name in **bold**, what it is, and what it does.",
    "- Add ONE short real example per bullet (max 12 words) — like this: Example: Earn $1,000, pay 10% = $100.",
    "- Money examples ONLY when the topic is about money, tax, business, economics or budgeting. For all other topics use a plain real-world example. NEVER force salary figures or prices into non-money topics.",
    "- TOTAL WORD COUNT: 150 to 200 words maximum for the whole answer. Count carefully. Short lines, scannable, friendly.",
    "",
    "STYLE:",
    "- Never open with an interrogation, never ask the learner to guess before teaching, never refuse, never print citations, links, 'grounded in public sources', or wiki references. No requests for API keys.",
    "- Explain clearly and directly, like ChatGPT: simple definitions, real examples, plain language.",
    "",
    `End with this exact line, alone at the end: "Want me to ask you questions to check? (yes/no)"`,
  ].join("\n");
}

function quizSystem(topic: string, asked: number, transcript: string): string {
  const next = asked + 1;
  return [
    "You are Sage, a friendly tutor checking understanding after teaching a lesson.",
    `The lesson topic was: "${topic}".`,
    "",
    "RULES:",
    `- Ask ONE question only, numbered ${next} of at most ${MAX_QUESTIONS}.`,
    "- Base it on what was taught: definitions, types, what each one does, and simple calculations.",
    "- Keep it short and answerable in one or two sentences. No multiple-choice options.",
    "- Short feedback only if the learner answered the previous question: correct (✅) or not (❌) with a one-sentence reason, then the next question. Never write paragraphs.",
    "- Do NOT reveal the answer to the new question. Do NOT add extra teaching.",
    transcript ? `Lesson context (do not repeat it verbatim): ${transcript.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function wrapUpSystem(topic: string): string {
  return `You are Sage. The learner has finished check questions on "${topic}". Give one short, warm closing message (2-3 sentences max): praise the effort, name the one idea worth remembering, and ask "Want to research another topic?" No new questions.`;
}

function wantsQuestions(text: string): boolean {
  return /\b(yes|yeah|yep|sure|ok(ay)?|please do|go ahead|ask me|alright|of course|definitely|y)\b/i.test(text);
}

function declinesQuestions(text: string): boolean {
  return /\b(no|nope|not now|later|skip|don'?t|do not|nah|n)\b/i.test(text);
}

function asksToStop(text: string): boolean {
  return /\b(stop|enough|that'?s all|finish|end|quit|done)\b/i.test(text);
}

function isTopicQuestion(text: string): boolean {
  return /\b(what|why|how|explain|tell me|teach|describe|types?|kinds?|difference|define|meaning|help|understand)\b/i.test(text);
}

function isOtherTopic(text: string): boolean {
  return isTopicQuestion(text) && text.split(/\s+/).length > 4;
}

export function cleanTopic(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^(please\s+)?(can you\s+)?(what are|what is|what's|tell me about|teach me about|teach me|explain|describe|help me (understand|with))\s*/i, "")
    .replace(/[?.!]+$/, "")
    .trim()
    .slice(0, 90);
}

/** Deterministic fallback questions — only used if the model is unreachable. */
function genericQuestion(topic: string, n: number): string {
  const bank = [
    `In your own words, what is **${topic}**?`,
    `Name two types or parts of **${topic}**, and say what each one does.`,
    `Give one real-life example of **${topic}**.`,
    `What is one common misunderstanding about **${topic}**?`,
    `Why does **${topic}** matter in everyday life?`,
    `Who is affected by **${topic}**, and how?`,
    `What is the difference between two kinds of **${topic}**?`,
    `If something about **${topic}** changed by 10%, how would you work out the change?`,
    `What happens when **${topic}** is ignored or done badly?`,
    `Teach **${topic}** to a friend in three sentences.`,
    `What is one rule or habit that makes **${topic}** work well?`,
    `True or false: everyone experiences **${topic}** the same way. Why?`,
    `What question about **${topic}** would you ask an expert?`,
    `Name one thing about **${topic}** you understand better now than at the start.`,
    `Final check: explain **${topic}** without using the word itself.`,
  ];
  return bank[(n - 1) % bank.length];
}

export async function tutorTurn(
  messages: { role: string; content: string }[],
  tutor: TutorState | undefined,
  title?: string,
): Promise<{ reply: string; tutor?: TutorState }> {
  const typed = (messages.filter((m) => m.role === "user").at(-1)?.content || "").trim();
  const clean = messages.slice(-12);

  // ---- greetings & thanks: one short sentence, never an essay -------------
  if (isGreeting(typed)) {
    const reply = GREETING_REPLIES[Math.floor(Date.now() / 1000) % GREETING_REPLIES.length];
    return { reply, tutor: { topic: "", phase: "idle", asked: 0, startedAt: Date.now() } };
  }
  if (THANKS_RE.test(typed) && typed.length <= 40) {
    return {
      reply: "You're welcome! 👋 Ask me anything else, or say a topic name and I will explain it simply.",
      tutor: tutor ?? { topic: "", phase: "idle", asked: 0, startedAt: Date.now() },
    };
  }

  // ---- learner finished a lesson, now chooses: questions or not ------------
  if (tutor && tutor.phase === "awaiting") {
    if (declinesQuestions(typed) && !wantsQuestions(typed)) {
      return { reply: FINISHED_TOPIC, tutor: { ...tutor, phase: "done" } };
    }
    if (wantsQuestions(typed) && !isTopicQuestion(typed)) {
      const reply =
        (await openRouter(clean, quizSystem(tutor.topic, 0, clean.map((m) => m.content).join("\n")))) ??
        genericQuestion(tutor.topic, 1);
      return { reply, tutor: { ...tutor, phase: "quiz", asked: 1 } };
    }
  }

  // ---- check-understanding session ----------------------------------------
  if (tutor && tutor.phase === "quiz") {
    if (asksToStop(typed)) {
      return {
        reply: `Great job! You finished **${tutor.topic}**. Want to research another topic?`,
        tutor: { ...tutor, phase: "done" },
      };
    }
    if (tutor.asked >= MAX_QUESTIONS) {
      const reply =
        (await openRouter(clean, wrapUpSystem(tutor.topic))) ?? `Great job! You finished **${tutor.topic}**. Want to research another topic?`;
      return { reply, tutor: { ...tutor, phase: "done" } };
    }
    const reply =
      (await openRouter(clean, quizSystem(tutor.topic, tutor.asked, clean.map((m) => m.content).join("\n")))) ??
      `Got it.\n\n${genericQuestion(tutor.topic, tutor.asked + 1)}`;
    return { reply, tutor: { ...tutor, asked: tutor.asked + 1 } };
  }

  // ---- normal teaching answer ---------------------------------------------
  const topic = cleanTopic(typed) || (tutor?.topic && tutor.phase !== "idle" ? tutor.topic : "") || title?.trim() || cleanTopic(typed) || "that";
  if (!cleanTopic(typed) && topic === "that") {
    return {
      reply: "Sure — what shall I explain? Give me a topic like **taxes**, **photosynthesis**, or **fractions**, and I will keep it short and clear.",
      tutor: { topic: "", phase: "idle", asked: 0, startedAt: Date.now() },
    };
  }
  const reply = await openRouter(clean, lessonSystem(topic));
  if (!reply) return { reply: UNAVAILABLE, tutor };
  const body = reply.split("\n").filter((line) => !/^\s*\*{0,2}(?:Do you want|Would you like|Want me|Ready for)\b.*(?:questions|quiz|check)/i.test(line)).join("\n").trim();
  return {
    reply: `${body}\n\nWant me to ask you questions to check? (yes/no)`,
    tutor: { topic, phase: "awaiting", asked: 0, startedAt: Date.now() },
  };
}
