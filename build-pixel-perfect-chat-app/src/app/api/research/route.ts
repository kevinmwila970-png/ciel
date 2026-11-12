import { researchTopic } from "@/server/wiki";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { topic?: string } | null;
  const topic = body?.topic?.trim() || "";
  if (!topic) return Response.json({ error: "Enter a topic." }, { status: 400 });
  const result = await researchTopic(topic);
  return Response.json(result);
}
