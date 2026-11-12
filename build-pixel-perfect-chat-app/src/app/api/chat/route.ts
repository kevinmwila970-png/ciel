import { tutorTurn, type TutorState } from "@/server/tutor";
import { analyzeImages, hasValidImage, type VisionTurn } from "@/server/vision";
import type { ChatAttachment } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
const MAX_BODY_BYTES = 15 * 1024 * 1024;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAttachment(value: unknown): ChatAttachment {
  if (!record(value) || !["image", "pdf", "text"].includes(String(value.kind))) throw new Error("Unsupported attachment.");
  const kind = value.kind as ChatAttachment["kind"];
  if (kind === "image" && !hasValidImage(value.dataUrl)) throw new Error("Please attach a valid PNG, JPEG, WebP, or GIF image under 3 MB after resizing.");
  return {
    id: typeof value.id === "string" ? value.id.slice(0, 80) : "attachment",
    kind,
    name: typeof value.name === "string" ? value.name.slice(0, 200) : "Attachment",
    size: typeof value.size === "number" && value.size >= 0 ? value.size : 0,
    mimeType: typeof value.mimeType === "string" ? value.mimeType.slice(0, 80) : "",
    ...(kind === "image" ? { dataUrl: value.dataUrl as string } : { text: typeof value.text === "string" ? value.text.slice(0, 24000) : "" }),
    pageCount: typeof value.pageCount === "number" ? Math.max(1, Math.min(1000, value.pageCount)) : undefined,
  };
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) return Response.json({ error: "That attachment is too large. Please choose a smaller image." }, { status: 413 });
  let body: Record<string, unknown>;
  let messages: VisionTurn[];
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "That attachment is too large." }, { status: 413 });
    const data: unknown = JSON.parse(raw);
    if (!record(data) || !Array.isArray(data.messages)) throw new Error("Send a message or attach an image first.");
    body = data;
    messages = data.messages.slice(-16).map((item): VisionTurn => {
      if (!record(item) || (item.role !== "user" && item.role !== "assistant")) throw new Error("Invalid message.");
      const attachments = item.role === "user" && Array.isArray(item.attachments) ? item.attachments.slice(0, 1).map(parseAttachment) : [];
      return { role: item.role, content: typeof item.content === "string" ? item.content.slice(0, 16000) : "", attachments };
    }).filter((m) => m.content.trim() || m.attachments?.length);
    if (!messages.length || messages.at(-1)?.role !== "user") throw new Error("Say something or attach an image first.");
  } catch (error) {
    return Response.json({ error: error instanceof SyntaxError ? "Invalid request." : error instanceof Error ? error.message : "Invalid attachment." }, { status: 400 });
  }

  let tutor: TutorState | undefined;
  if (record(body.tutor) && ["idle", "awaiting", "quiz", "done"].includes(String(body.tutor.phase))) {
    tutor = {
      topic: String(body.tutor.topic || "").slice(0, 120),
      phase: body.tutor.phase as TutorState["phase"],
      asked: Math.min(15, Math.max(0, Number(body.tutor.asked) || 0)),
      startedAt: Number(body.tutor.startedAt) || Date.now(),
    };
  }
  const last = messages.at(-1)!;
  const hasImage = messages.some((m) => m.attachments?.some((a) => a.kind === "image"));
  const greetingOnly = /^(hi|hello|hey|good morning|good afternoon|good evening)[!.?\s]*$/i.test(last.content.trim()) && !last.attachments?.length;
  try {
    if (hasImage && !greetingOnly) {
      const content = await analyzeImages(messages, request.signal);
      return Response.json({ content, tutor: { topic: "Image discussion", phase: "idle", asked: 0, startedAt: Date.now() } });
    }
    const textMessages = messages.map((m) => ({
      role: m.role,
      content: [m.content, ...(m.attachments || []).filter((a) => a.text).map((a) => `[Attached ${a.name}${a.pageCount ? `, ${a.pageCount} pages` : ""}]\n${a.text}`)].filter(Boolean).join("\n\n"),
    }));
    const result = await tutorTurn(textMessages, tutor, typeof body.title === "string" ? body.title : undefined);
    return Response.json({ content: result.reply, tutor: result.tutor });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sage couldn't complete that request. Please try again." }, { status: 503 });
  }
}
