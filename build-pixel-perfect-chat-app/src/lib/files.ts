"use client";

import type { ChatAttachment, FileProgress } from "./types";
import type { Worker } from "tesseract.js";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
type Report = (progress: FileProgress) => void;
export type ExtractedFile = { text: string; pageCount?: number; confidence?: number };

export function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileKind(file: File): ChatAttachment["kind"] {
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic|avif)$/i.test(file.name)) return "image";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("text/") || /\.(txt|md|csv|notes)$/i.test(file.name)) return "text";
  throw new Error("Choose an image, PDF, or a TXT/Markdown notes file.");
}

function assertFile(file: File) {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Please choose a file smaller than 15 MB.");
}

export function readFile(file: Blob, as: "data" | "text" | "buffer", signal?: AbortSignal, report?: Report): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const reader = new FileReader();
    const abort = () => { reader.abort(); reject(new DOMException("Canceled", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    reader.onprogress = (e) => { if (e.lengthComputable) report?.({ label: "📄 Reading file…", percent: e.loaded / e.total * 100 }); };
    reader.onload = () => { signal?.removeEventListener("abort", abort); resolve(reader.result as string | ArrayBuffer); };
    reader.onerror = () => { signal?.removeEventListener("abort", abort); reject(new Error("This file could not be read. Please choose it again.")); };
    reader.onabort = () => { signal?.removeEventListener("abort", abort); reject(new DOMException("Canceled", "AbortError")); };
    if (as === "data") reader.readAsDataURL(file);
    else if (as === "text") reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image format cannot be opened here. Please use JPEG, PNG, WebP, or GIF."));
    image.src = src;
  });
}

// Retain small images byte-for-byte. Resize large images to keep the request,
// chat history, and IndexedDB manageable without losing readable detail.
export async function imageData(file: File, signal?: AbortSignal): Promise<string> {
  assertFile(file);
  const source = await readFile(file, "data", signal) as string;
  const image = await decodeImage(source);
  signal?.throwIfAborted();
  const allowed = /^data:image\/(png|jpeg|webp|gif);base64,/.test(source);
  if (allowed && source.length <= 3_700_000 && Math.max(image.width, image.height) <= 2400) return source;
  const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare this image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let result = canvas.toDataURL("image/jpeg", 0.9);
  if (result.length > 4_000_000) result = canvas.toDataURL("image/jpeg", 0.7);
  canvas.width = canvas.height = 1;
  return result;
}

export function cleanExtractedText(text: string): string {
  return text.normalize("NFKC").replace(/\u0000|\uFFFD/g, "").replace(/\u00ad/g, "")
    .replace(/([A-Za-z])-\r?\n([a-z])/g, "$1$2").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isReadableText(text: string): boolean {
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  if (words.length < 6) return false;
  const singles = words.filter((w) => w.length === 1 && !/^[aAiI0-9]$/.test(w)).length;
  return singles / words.length < 0.22 && words.filter((w) => w.length >= 3).length >= 4;
}

// PDF.js emits positioned glyph runs. Join adjacent fragments by their actual
// gap, not by inserting a space between every character.
function pdfText(items: TextItem[]): string {
  let result = "";
  let previous: TextItem | null = null;
  for (const item of items) {
    if (!item.str && !item.hasEOL) continue;
    if (previous && item.str && !result.endsWith("\n")) {
      const h = Math.max(Math.abs(item.height), Math.abs(previous.height), 8);
      const rowChange = Math.abs(item.transform[5] - previous.transform[5]) > h * 0.6;
      const gap = item.transform[4] - (previous.transform[4] + previous.width);
      if (rowChange) result += "\n";
      else if (gap > h * 0.12 && !/\s$/.test(result) && !/^\s|^[,.;:!?]/.test(item.str)) result += " ";
    }
    result += item.str;
    if (item.hasEOL) result += "\n";
    previous = item;
  }
  return cleanExtractedText(result);
}

export async function extractFile(file: File, report: Report, signal?: AbortSignal): Promise<ExtractedFile> {
  assertFile(file);
  const kind = fileKind(file);
  signal?.throwIfAborted();
  report({ label: "📄 Reading file…", percent: 0, detail: `${file.name} · ${fileSize(file.size)}` });
  let worker: Worker | undefined;
  let stopped = false;
  let currentProgress: (value: number) => void = () => {};
  let jobTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectDeadline: (e: Error) => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    rejectDeadline = reject;
    jobTimer = setTimeout(() => reject(new Error("Reading is taking too long. Try a smaller file or a clearer scan.")), 150000);
  });
  const cancel = () => { if (worker) void worker.terminate(); rejectDeadline(new DOMException("Canceled", "AbortError")); };
  signal?.addEventListener("abort", cancel, { once: true });

  async function ocr(image: string | HTMLCanvasElement, progress: (value: number) => void) {
    currentProgress = progress;
    progress(0);
    if (!worker) {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        workerPath: "/vendor/tesseract/worker.min.js",
        corePath: "/vendor/tesseract",
        langPath: "/vendor/tesseract",
        workerBlobURL: false,
        logger: (m) => { if (!signal?.aborted && m.status === "recognizing text") currentProgress(m.progress); },
        errorHandler: () => rejectDeadline(new Error("The image reader could not start. Please try again.")),
      });
      if (stopped || signal?.aborted) {
        await worker.terminate();
        throw new DOMException("Canceled", "AbortError");
      }
      await worker.setParameters({ preserve_interword_spaces: "1", user_defined_dpi: "300" });
    }
    const { data } = await worker.recognize(image);
    signal?.throwIfAborted();
    if (data.confidence < 35 || !isReadableText(data.text)) {
      throw new Error("This scan is not clear enough to read reliably. Upload a sharper image or paste your notes; Sage won't make a quiz from garbled text.");
    }
    return { text: cleanExtractedText(data.text), confidence: data.confidence };
  }

  async function run(): Promise<ExtractedFile> {
    if (kind === "text") {
      const text = cleanExtractedText(await readFile(file, "text", signal, report) as string);
      if (!text) throw new Error("No readable text was found in this file.");
      report({ label: "📄 Notes ready", percent: 100 });
      return { text };
    }
    if (kind === "image") {
      const src = await imageData(file, signal);
      const img = await decodeImage(src);
      const canvas = document.createElement("canvas");
      const scale = Math.min(3, Math.max(1, 1800 / img.width));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = await ocr(canvas, (p) => report({ label: `🔍 Scanning image ${Math.round(p * 100)}%…`, percent: 5 + p * 90, detail: file.name }));
      canvas.width = canvas.height = 1;
      report({ label: "📄 Text extracted", percent: 100 });
      return result;
    }
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
    const buffer = await readFile(file, "buffer", signal) as ArrayBuffer;
    const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, standardFontDataUrl: "/vendor/pdf-fonts/", wasmUrl: "/vendor/pdf-wasm/", useSystemFonts: true });
    const cancelPdf = () => { void task.destroy(); };
    signal?.addEventListener("abort", cancelPdf, { once: true });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 100) throw new Error("Please choose up to 100 PDF pages at a time.");
      const pages: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        signal?.throwIfAborted();
        report({ label: `📖 Extracting Page ${n}/${pdf.numPages}…`, percent: 5 + (n - 1) / pdf.numPages * 90, detail: file.name });
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        let text = pdfText(content.items.filter((i): i is TextItem => "str" in i));
        if (!isReadableText(text)) {
          const viewport = page.getViewport({ scale: Math.min(2.5, 1900 / page.getViewport({ scale: 1 }).width) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport, background: "white" }).promise;
          text = (await ocr(canvas, (p) => report({ label: `📖 Extracting Page ${n}/${pdf.numPages} · scanning ${Math.round(p * 100)}%…`, percent: 5 + ((n - 1 + p) / pdf.numPages) * 90 }))).text;
          canvas.width = canvas.height = 1;
        }
        pages.push(text);
        page.cleanup();
      }
      report({ label: `📄 ${pdf.numPages} pages read`, percent: 100 });
      return { text: pages.join("\n\n"), pageCount: pdf.numPages };
    } finally {
      signal?.removeEventListener("abort", cancelPdf);
      await task.destroy();
    }
  }
  try {
    return await Promise.race([run(), deadline]);
  } finally {
    stopped = true;
    clearTimeout(jobTimer);
    signal?.removeEventListener("abort", cancel);
    if (worker) await worker.terminate().catch(() => undefined);
  }
}

export async function prepareAttachment(file: File, report: Report, signal?: AbortSignal): Promise<ChatAttachment> {
  const kind = fileKind(file);
  const base = { id: crypto.randomUUID(), kind, name: file.name, size: file.size, mimeType: file.type };
  if (kind === "image") {
    report({ label: "👁️ Reading your image…", detail: file.name });
    const dataUrl = await imageData(file, signal);
    return { ...base, dataUrl, mimeType: dataUrl.slice(5, dataUrl.indexOf(";")) };
  }
  const result = await extractFile(file, report, signal);
  return { ...base, ...result };
}
