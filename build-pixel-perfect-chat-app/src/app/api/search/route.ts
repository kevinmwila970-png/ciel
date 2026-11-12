import { explainConcept, wikiExtract, wikiSearch, wikiSummary } from "@/server/wiki";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const mode = searchParams.get("mode") || "search";
  if (!q) return Response.json({ error: "Enter something to look up." }, { status: 400 });

  if (mode === "explain") {
    const explained = await explainConcept(q);
    return Response.json(explained);
  }

  if (mode === "extract") {
    const found = await wikiSearch(q, 1);
    if (!found[0]) return Response.json({ title: q, extract: "", sources: [] });
    const extract = (await wikiExtract(found[0].title)) || (await wikiSummary(found[0].title))?.extract || "";
    return Response.json({ title: found[0].title, extract, sources: found });
  }

  const sources = await wikiSearch(q, 5);
  const summary = sources[0] ? await wikiSummary(sources[0].title) : null;
  return Response.json({
    content: summary?.extract || "No public summary was found for that query. Try a more specific phrase.",
    sources: summary
      ? [{ title: summary.title, url: summary.url, snippet: summary.extract.slice(0, 180) }, ...sources.filter((s) => s.title !== summary.title)].slice(0, 5)
      : sources,
  });
}
