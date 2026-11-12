"use client";

import type { FileProgress } from "./types";

export async function readJsonWithProgress<T>(response: Response, report: (p: FileProgress) => void, label: string): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || "The download failed. Please try again.");
  }
  if (!response.body) return response.json() as Promise<T>;
  const reader = response.body.getReader();
  const total = Number(response.headers.get("content-length"));
  const known = total > 0 && !response.headers.get("content-encoding");
  const decoder = new TextDecoder();
  let bytes = 0;
  let content = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      content += decoder.decode(value, { stream: true });
      report({ label, percent: known ? Math.min(99, bytes / total * 100) : undefined, detail: `${(bytes / 1024).toFixed(0)} KB received${known ? ` of ${(total / 1024).toFixed(0)} KB` : ""}` });
    }
    content += decoder.decode();
    report({ label: "Download complete", percent: 100 });
    return JSON.parse(content) as T;
  } finally { reader.releaseLock(); }
}
