// Socratic reply engine. Works with no API key and never fabricates facts:
// it reflects the learner's own words back as questions, offers method hints,
// and always ends with a check. No sources, no wiki boxes — those belong to
// the Research Trail only.

type Turn = { role: string; content: string };

const GREETING = /^(hi|hey|hello|yo|sup|good (morning|afternoon|evening))\b/i;
const STUCK = /\b(i (really )?don'?t know|no idea|idk|not sure|i'?m stuck|lost)\b/i;
const DEMAND = /\b(just )?(give|tell) me the (answer|solution)|do it for me|write (it|this) for me\b/i;
const HINT = /\b(hint|clue|nudge|help me start|point me)\b/i;
const CHECK = /\b(check|is this (right|correct)|did i get|grade|review)\b/i;
const MATH = /[0-9][\s]*[-+*/=^][\s]*[0-9]|\b(solve|equation|derivative|integral|factor|algebra|calculate|percent|percentage|fraction)\b/i;
const CODE = /\b(code|python|javascript|function|bug|error|compile|api|loop|array)\b/i;
const WRITE = /\b(essay|thesis|paragraph|argument|outline|report|write|draft|claim|introduction|conclusion)\b/i;
const EXAM = /\b(revise|revision|exam|test tomorrow|study plan|memorise|memorize|timetable|schedule)\b/i;

function seed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(items: T[], n: number): T {
  return items[n % items.length];
}

function topicOf(raw: string): string {
  let t = raw.trim().replace(/\s+/g, " ").replace(/[?!.]+$/, "");
  t = t.replace(/^(can you |could you |please |i need to |i want to |i'?m trying to |help me (with |to )?|tell me about |explain |what is |what'?s |what are |who is |how do i |how does |how do you |why is |why does )/i, "");
  if (t.length > 72) t = `${t.slice(0, 69).trim()}…`;
  return t || raw.trim().slice(0, 72);
}

function turnCount(messages: Turn[]): number {
  return messages.filter((m) => m.role === "user").length;
}

function lastAssistant(messages: Turn[]): string {
  const prior = messages.slice(0, -1).filter((m) => m.role === "assistant");
  return prior.length ? prior[prior.length - 1].content : "";
}

export function socraticReply(messages: Turn[]): string {
  const userTurns = messages.filter((m) => m.role === "user");
  const raw = userTurns[userTurns.length - 1]?.content?.trim() || "";
  if (!raw) {
    return "What are you trying to work out? Give me the question in your own words and we will start from there.";
  }
  const n = seed(raw) + turnCount(messages) * 7;
  const topic = topicOf(raw);
  const prior = lastAssistant(messages);

  if (GREETING.test(raw) && raw.length < 24) {
    return "Hello. I teach by asking, so we will think this through together rather than copy an answer.\n\nWhat is one thing you are trying to understand today — and what have you already tried?";
  }

  if (DEMAND.test(raw)) {
    return `I will not hand you a finished answer — you would lose the exact skill you are being tested on. What I will do is get you to it in smaller steps.\n\n1. Without solving anything, what is “${topic}” actually asking you to find or decide?\n2. What is the very first thing you can say for certain about it?\n\nAnswer either one and I will give you the next move.`;
  }

  if (STUCK.test(raw)) {
    return `Good — naming that is the honest first step. Let us shrink it until it stops being scary.\n\n1. What is the smallest piece of “${topic}” you could handle in one minute? Name it, not the whole thing.\n2. Which word in the question are you least sure about? Define that first, and the rest usually loosens.\n\nHint: when you are stuck, you are usually missing a definition or a given — not the method.`;
  }

  if (HINT.test(raw)) {
    return `A hint, not the answer.\n\n${pick([
      "Write down what is given and what is asked, side by side. The gap between them is the method.",
      "Try the smallest possible version — one number, one case, one sentence. What pattern shows up?",
      "Find the rule or definition that mentions the thing you are asked about. Which part of it do you not satisfy yet?",
      "Work backwards from what a finished answer would look like. What would have to be true just before that?",
    ], n)}\n\nTell me what that makes you want to try, and I will react to your attempt.`;
  }

  if (CHECK.test(raw)) {
    return `I cannot see your work yet, so let us audit it together. Read your answer against these four tests:\n\n1. Did you answer the question that was asked, or a nearby one?\n2. Is every step justified by something given or already proven?\n3. If a classmate read it, could they repeat your reasoning without you?\n4. Where is your weakest link — the step you would not want to be questioned on?\n\nPoint me at that weakest step and I will ask you about it until it holds or breaks.`;
  }

  if (MATH.test(raw)) {
    return `Before any numbers — describe the situation, not the symbols.\n\n1. In one sentence: what does “${topic}” represent in the real world?\n2. What is given, and what is asked? Write them as two separate lists.\n\nHint: most mistakes come from applying a rule before confirming its conditions are met. Which condition could fail here?\n\nYour turn: give me the two lists.`;
  }

  if (CODE.test(raw)) {
    return `Do not fix the code yet — describe the behaviour.\n\n1. What did you expect the code to do, in one sentence?\n2. What does it actually do, and where exactly does that first differ?\n\nHint: shrink it. Delete or stub everything that is not needed to reproduce the problem. The bug usually survives in three lines.\n\nTell me the smallest version that still misbehaves.`;
  }

  if (WRITE.test(raw)) {
    return `Let us pressure-test the thinking before the wording.\n\n1. State your claim in one sentence a reasonable person could disagree with. Can you?\n2. What is the strongest objection to it — not the silliest one?\n\nHint: an argument is only as strong as its best counterargument handled fairly. Write the objection in your own words first.\n\nWhich of the two do you want to start with?`;
  }

  if (EXAM.test(raw)) {
    return `A plan that ignores your real constraints is fantasy. Let us build one that survives the week.\n\n1. How many days until the test, and how many honest study minutes do you really have per day?\n2. Which topics can you already explain without notes, and which are completely cold?\n\nHint: spend your time on the questions you get wrong twice, not on the pages you enjoy re-reading.\n\nGive me those two numbers and I will help you shape the week.`;
  }

  const opener = prior && /what do you already|your turn|which one|tell me/i.test(prior)
    ? "Let us keep pulling that thread."
    : "Let us start from what you already have.";

  return `${opener}\n\nYou said “${topic}”. Before I add anything, commit to a guess — a wrong guess is useful, a blank is not.\n\n1. What do you already believe is true about this, and what made you think that?\n2. If that belief were wrong, what would you expect to notice instead?\n\nHint: ${pick([
    "define the key word first, then the question often answers itself",
    "find one concrete example and one edge case",
    "separate what you know from what you have only heard",
    "compare it with something that looks similar but behaves differently",
  ], n)}\n\nAnswer 1 in a sentence and I will ask the next question.`;
}
