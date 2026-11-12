import type { Source } from "@/lib/types";

const UA = "Mozilla/5.0 (compatible; SageStudyTutor/1.0; educational)";

export async function wikiSearch(query: string, limit = 3): Promise<Source[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=${limit}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { query?: { search?: { title: string; snippet: string }[] } };
  return (data.query?.search ?? []).map((item) => ({
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    snippet: String(item.snippet || "").replace(/<[^>]+>/g, ""),
  }));
}

export async function wikiSummary(title: string): Promise<{ title: string; extract: string; url: string } | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  if (!data.extract) return null;
  return {
    title: data.title || title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

export async function wikiExtract(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exchars=3500&redirects=1&titles=${encodeURIComponent(title)}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return "";
  const data = (await res.json()) as { query?: { pages?: Record<string, { extract?: string }> } };
  const pages = data.query?.pages ?? {};
  const first = Object.values(pages)[0];
  return first?.extract || "";
}

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "meta-llama/llama-3.1-8b-instruct",
];

const missingModels = new Map<string, number>();

export async function openRouter(messages: { role: string; content: string }[], system: string, options?: { maxTokens?: number; temperature?: number }): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const models = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : OPENROUTER_MODELS;
  for (const model of models) {
    if ((missingModels.get(model) || 0) > Date.now()) continue;
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://sage.local",
          "X-Title": "Sage",
        },
        body: JSON.stringify({
          model,
          temperature: options?.temperature ?? 0.4,
          max_tokens: options?.maxTokens ?? 700,
          messages: [{ role: "system", content: system }, ...messages],
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (res.status === 401 || res.status === 403) return null; // bad key — retrying won't help
      if (!res.ok) {
        if (res.status === 404) missingModels.set(model, Date.now() + 600000);
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text === "string" && text.trim()) return text.trim();
    } catch {
      continue;
    }
  }
  return null;
}

export async function explainConcept(concept: string): Promise<{ content: string; sources: Source[] }> {
  const sources = await wikiSearch(concept, 3);
  const summary = sources[0] ? await wikiSummary(sources[0].title) : null;
  if (!summary) {
    return {
      content: `I couldn't find a verified public source for “${concept}”, so I won't invent a walkthrough. Try the standard name of the idea.`,
      sources: [],
    };
  }
  const sentences = summary.extract.split(/(?<=\.)\s+/).filter(Boolean);
  return {
    content: [
      summary.title,
      "",
      `What it is. ${sentences[0] || summary.extract}`,
      "",
      `Why it matters. ${sentences[1] || "It gives you a handle on a bigger system — notice what it explains that a surface description cannot."}`,
      "",
      "Step by step.",
      ...sentences.slice(0, 4).map((s, i) => `${i + 1}. ${s}`),
      "",
      `Analogy (a thinking aid, not a new fact). Treat “${summary.title}” like a map legend: the legend is not the territory, but once you can read one symbol, the rest of the map starts to speak. Which symbol in this idea unlocks the others for you?`,
      "",
      `Check. Without looking back, explain ${summary.title} in one sentence to a curious classmate. What did you leave out, and was that essential?`,
      "",
      `Source: ${summary.url}`,
    ].join("\n"),
    sources: [
      { title: summary.title, url: summary.url, snippet: summary.extract.slice(0, 180) },
      ...sources.filter((s) => s.title !== summary.title).slice(0, 2),
    ],
  };
}

export async function researchTopic(topic: string): Promise<{ summary: string; sources: Source[]; followUps: string[] }> {
  const found = await wikiSearch(topic, 3);
  const top = found[0] ? await wikiSummary(found[0].title) : null;
  const sources: Source[] = [];
  if (top) sources.push({ title: top.title, url: top.url, snippet: top.extract.slice(0, 220) });
  for (const item of found) {
    if (sources.length >= 3) break;
    if (!sources.some((s) => s.url === item.url)) sources.push(item);
  }
  while (sources.length < 3 && found[sources.length]) sources.push(found[sources.length]);
  const summary = top
    ? top.extract
    : "I couldn't reach a verified summary for that topic, so I won't invent one. The source list may still give you a place to start.";
  return {
    summary,
    sources: sources.slice(0, 3),
    followUps: [
      `What is a common misunderstanding about ${topic}?`,
      `How would you test an idea related to ${topic}?`,
      `What came before ${topic}, historically or logically?`,
    ],
  };
}
