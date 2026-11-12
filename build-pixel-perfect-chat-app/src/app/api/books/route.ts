import type { GutenbergBook } from "@/lib/types";
import { CLASSICS } from "@/lib/classics";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
const cache = new Map<string, { books: GutenbergBook[]; count: number; time: number }>();
type GutBook = { id: number; title: string; authors?: { name: string }[]; subjects?: string[]; formats?: Record<string, string> };

function mapBook(book: GutBook): GutenbergBook {
  const formats = book.formats ?? {};
  return { id: book.id, title: book.title, author: book.authors?.[0]?.name || "Unknown author", cover: formats["image/jpeg"] || null, textUrl: formats["text/plain; charset=utf-8"] || formats["text/plain; charset=us-ascii"] || formats["text/plain"] || null, subjects: book.subjects ?? [] };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().slice(0, 200);
  const ids = (searchParams.get("ids") || "").split(",").filter((v) => /^\d{1,8}$/.test(v)).slice(0, 20);
  const key = `${search.toLowerCase()}|${ids.join(",")}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 3600000) return Response.json({ books: cached.books, count: cached.count });
  const url = ids.length ? `https://gutendex.com/books/?ids=${ids.join(",")}` : search ? `https://gutendex.com/books/?search=${encodeURIComponent(search)}` : "https://gutendex.com/books/";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!res.ok) throw new Error("Catalog unavailable");
    const data = await res.json() as { results?: GutBook[]; count?: number };
    if (!Array.isArray(data.results)) throw new Error("Invalid catalog response");
    const books = data.results.slice(0, 20).map(mapBook);
    const count = data.count ?? books.length;
    if (cache.size > 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { books, count, time: Date.now() });
    return Response.json({ books, count });
  } catch {
    if (cached) return Response.json({ books: cached.books, count: cached.count, notice: "The live catalog is taking longer than usual. Showing previously retrieved results." });
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    const books = CLASSICS.filter((b) => (!ids.length || ids.includes(String(b.id))) && words.every((w) => `${b.title} ${b.author} ${b.subjects.join(" ")}`.toLowerCase().includes(w)));
    return Response.json({ books, count: books.length, ...(books.length ? { notice: "The live catalog is taking longer than usual. Showing matching titles from the 20-book classics collection." } : { error: "The book catalog is temporarily unavailable. Please try again shortly." }) });
  }
}
