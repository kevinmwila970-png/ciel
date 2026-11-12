export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  if (!/^\d{1,8}$/.test(id)) return Response.json({ error: "Missing book id." }, { status: 400 });
  let supplied = "";
  try {
    const url = new URL(searchParams.get("url") || "");
    if (url.protocol === "https:" && ["www.gutenberg.org", "gutenberg.org"].includes(url.hostname)) supplied = url.href;
  } catch { /* Use the canonical Gutenberg URLs below. */ }
  const candidates = [...new Set([
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, supplied,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ].filter(Boolean))];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/plain,*/*" }, cache: "no-store", signal: AbortSignal.any([request.signal, AbortSignal.timeout(18000)]) });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.length > 200 && !/^\s*<(?:!doctype|html)/i.test(text)) {
        const content = JSON.stringify({ text, url });
        return new Response(content, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Length": String(Buffer.byteLength(content)) } });
      }
    } catch { if (request.signal.aborted) break; }
  }
  return Response.json({ error: "The full book could not be reached. Please try again when your connection is available." }, { status: 502 });
}
