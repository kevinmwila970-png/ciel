import { openRouter } from "@/server/wiki";
import { socraticReply } from "@/server/socratic";

export const dynamic = "force-dynamic";

const SYSTEM =
  "You are a Socratic tutor. You teach how to think, not what to think. Ask questions step by step. Never give the direct answer. Give hints only when the student asks for a hint, and even then a nudge, not the solution. One or two questions at a time.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: { role: string; content: string }[];
    hint?: boolean;
    topic?: string;
  } | null;
  const messages = (body?.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .slice(-12);
  const topic = body?.topic || [...messages].reverse().find((m) => m.role === "user")?.content || "this idea";

  if (body?.hint) {
    const hintSystem = `${SYSTEM} The student asked for a hint. Give one short hint that points at a method, never the final answer.`;
    const live = await openRouter([{ role: "user", content: `Give a hint, not the answer, about: ${topic}` }], hintSystem);
    if (live) return Response.json({ content: live });
    return Response.json({
      content: `Hint, not the answer: look at the smallest piece of this. What is one thing you know for certain about “${topic.slice(0, 80)}”, and what would have to be true next?`,
    });
  }
  if (!messages.length) return Response.json({ error: "Ask a question to begin." }, { status: 400 });
  const live = await openRouter(messages, SYSTEM);
  if (live) return Response.json({ content: live });
  return Response.json({ content: socraticReply(messages) });
}
