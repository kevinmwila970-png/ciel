export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^\d{1,8}$/.test(id)) return new Response("Invalid book", { status: 400 });
  try {
    const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return new Response("Cover unavailable", { status: 404 });
    const data = await res.arrayBuffer();
    if (data.byteLength > 2_000_000) return new Response("Cover too large", { status: 413 });
    return new Response(data, { headers: { "Content-Type": "image/jpeg", "Content-Length": String(data.byteLength), "Cache-Control": "public, max-age=86400" } });
  } catch { return new Response("Cover unavailable", { status: 502 }); }
}
