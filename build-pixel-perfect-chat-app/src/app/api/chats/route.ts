import { db } from "@/db";
import { serverChats } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId") || "";
  if (!userId) return Response.json({ chats: [] });
  const rows = await db.select().from(serverChats).where(eq(serverChats.userId, userId)).orderBy(desc(serverChats.updatedAt));
  const chats = rows.map((row) => {
    let messages: unknown = [];
    try {
      messages = JSON.parse(row.messages);
    } catch {
      messages = [];
    }
    return {
      id: row.id,
      title: row.title,
      messages,
      pinned: row.pinned,
      createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now(),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : Date.now(),
      lastOpenedAt: row.updatedAt instanceof Date ? row.updatedAt.getTime() : 0,
    };
  });
  return Response.json({ chats });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    chat?: {
      id: string;
      title: string;
      messages: unknown;
      pinned?: boolean;
      createdAt?: number;
    };
  } | null;
  if (!body?.userId || !body.chat?.id) return Response.json({ error: "Missing chat." }, { status: 400 });
  const now = new Date();
  const payload = {
    id: body.chat.id,
    userId: body.userId,
    title: body.chat.title || "New chat",
    messages: JSON.stringify(body.chat.messages ?? []),
    pinned: Boolean(body.chat.pinned),
    createdAt: body.chat.createdAt ? new Date(body.chat.createdAt) : now,
    updatedAt: now,
  };
  await db
    .insert(serverChats)
    .values(payload)
    .onConflictDoUpdate({
      target: serverChats.id,
      set: {
        title: payload.title,
        messages: payload.messages,
        pinned: payload.pinned,
        updatedAt: now,
      },
    });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const userId = searchParams.get("userId") || "";
  if (!id || !userId) return Response.json({ error: "Missing chat." }, { status: 400 });
  await db.delete(serverChats).where(eq(serverChats.id, id));
  return Response.json({ ok: true });
}
