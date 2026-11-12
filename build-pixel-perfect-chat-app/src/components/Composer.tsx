"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ChatAttachment, ComposerMode, FileProgress } from "@/lib/types";
import { fileSize, prepareAttachment } from "@/lib/files";
import { LoadingStatus } from "./LoadingStatus";
import { Icon } from "./icons";

const MODES: { id: ComposerMode; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "explain", label: "Explain a concept" },
  { id: "timetable", label: "Study timetable" },
  { id: "search", label: "Search the web" },
];

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((ev: Event & { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
};

function getRec(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, attachment?: ChatAttachment) => void;
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
  busy?: boolean;
  placeholder?: string;
  droppedFile?: File | null;
  resetId?: string | null;
};

export const Composer = memo(function Composer({ value, onChange, onSend, mode, onMode, busy, placeholder = "Ask Sage", droppedFile, resetId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const task = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | undefined>();
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState<FileProgress | null>(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<Rec | null>(null);

  const clearFile = useCallback(() => {
    task.current?.abort();
    task.current = null;
    setAttachment(undefined);
    setSelected(null);
    setProgress(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onFile = useCallback(async (file: File) => {
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setSelected({ name: file.name, size: file.size });
    setAttachment(undefined);
    setError("");
    setProgress({ label: file.type.startsWith("image/") ? "👁️ Reading your image…" : "📄 Reading file…", percent: 0 });
    try {
      const result = await prepareAttachment(file, (p) => { if (!controller.signal.aborted) setProgress(p); }, controller.signal);
      if (!controller.signal.aborted) { setAttachment(result); setProgress(null); }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "This file couldn't be opened.");
        setProgress(null);
      }
    }
  }, []);

  useEffect(() => { clearFile(); }, [resetId, clearFile]);
  useEffect(() => { if (droppedFile) void onFile(droppedFile); }, [droppedFile, onFile]);
  useEffect(() => () => { task.current?.abort(); recRef.current?.stop(); }, []);

  function toggleMic() {
    if (recRef.current) { recRef.current.stop(); return; }
    const rec = getRec();
    if (!rec) { setError("Voice input is unavailable in this browser. You can still type your question."); return; }
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => onChange(Array.from(ev.results).map((row) => row[0].transcript).join(" "));
    rec.onend = () => { recRef.current = null; setListening(false); };
    rec.onerror = () => { setError("Microphone access failed. Check your browser's microphone permission."); setListening(false); recRef.current = null; };
    try { recRef.current = rec; rec.start(); setListening(true); } catch { recRef.current = null; setError("Couldn't start voice input. Try again."); }
  }

  const label = MODES.find((item) => item.id === mode)?.label || "Auto";
  return (
    <div className="composer-wrap">
      {selected ? (
        <div className="attachment-preview">
          {attachment?.kind === "image" && attachment.dataUrl ? (
            <img className="attachment-thumb" src={attachment.dataUrl} alt={`Preview of ${attachment.name}`} />
          ) : (
            <div className="attachment-file-icon" aria-hidden="true">{progress && selected.name.match(/\.(png|jpe?g|gif|webp)$/i) ? "🖼️" : "📄"}<span>{/\.pdf$/i.test(selected.name) ? "PDF" : "FILE"}</span></div>
          )}
          <div className="attachment-meta">
            <strong title={selected.name}>{selected.name}</strong>
            <span>{fileSize(selected.size)}{attachment?.pageCount ? ` · ${attachment.pageCount} ${attachment.pageCount === 1 ? "page" : "pages"}` : ""}</span>
            {!progress && attachment ? <span className="attachment-ready">✓ Ready to send</span> : null}
          </div>
          <button className="icon-btn attachment-remove" type="button" onClick={clearFile} aria-label="Remove attachment"><Icon name="close" size={16} /></button>
        </div>
      ) : null}
      {progress ? <LoadingStatus {...progress} /> : null}
      {error ? <p className="attachment-error" role="alert">{error}</p> : null}
      <form className="composer" onSubmit={(e) => {
        e.preventDefault();
        if (busy || progress || (!value.trim() && !attachment)) return;
        onSend(value.trim() || (attachment?.kind === "image" ? "What do you think of this image?" : "Help me understand these notes."), attachment);
        clearFile();
      }}>
        <button className="composer-plus" type="button" aria-label="Attach PDF, image, or notes" onClick={() => fileRef.current?.click()} disabled={busy}><Icon name="plus" size={16} /></button>
        <input className="composer-input" value={value} placeholder={placeholder} aria-label={placeholder} onChange={(e) => onChange(e.target.value)} />
        <div className="composer-tools">
          <div style={{ position: "relative" }}>
            <button className="ghost-select" type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}><Icon name="leaf" size={14} /><span className="composer-mode-label">{label}</span> ▾</button>
            {open ? <div className="menu composer-mode-menu" role="listbox">{MODES.map((item) => <button key={item.id} type="button" role="option" aria-selected={mode === item.id} onClick={() => { onMode(item.id); setOpen(false); }}>{item.label}</button>)}</div> : null}
          </div>
          <button className={`icon-btn ${listening ? "mic-live" : ""}`} type="button" aria-label={listening ? "Stop voice input" : "Voice input"} onClick={toggleMic}><Icon name="mic" size={16} /></button>
          <button className="send-btn" type="submit" aria-label="Send" disabled={busy || !!progress || (!value.trim() && !attachment)}><Icon name="arrow" size={16} /></button>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.md,.csv,.notes,text/plain" hidden aria-label="Choose attachment" onChange={(e) => { const file = e.target.files?.[0]; if (file) void onFile(file); e.target.value = ""; }} />
      </form>
    </div>
  );
});
