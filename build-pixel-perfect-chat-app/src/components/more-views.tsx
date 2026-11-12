"use client";

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DueBanner } from "./study-views";
import { useApp } from "@/lib/store";
import { buildTimetable, parseSubjects, quizFromText, timetableToIcs, todayISO, addDaysISO, uid, formatWhen } from "@/lib/study";
import { THEMES } from "@/lib/themes";
import { readJsonWithProgress } from "@/lib/download";
import { extractFile, isReadableText, readFile } from "@/lib/files";
import { LoadingStatus } from "./LoadingStatus";
import type { FileProgress, GutenbergBook, QuizQuestion } from "@/lib/types";

import { CLASSICS } from "@/lib/classics";

export const LibrarySearch = memo(function LibrarySearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="lib-search">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search books... (e.g. frankenstein, pride prejudice, psychology)" aria-label="Search books" />
      {value ? <button className="clear" type="button" onClick={() => onChange("")} aria-label="Clear search">×</button> : null}
    </div>
  );
});

export function LibraryView() {
  const { username, books, online, setReaderBook } = useApp();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("Classics");
  const [results, setResults] = useState<GutenbergBook[]>(CLASSICS);
  const [searching, setSearching] = useState(false);
  const [catalogNote, setCatalogNote] = useState("");
  const [status, setStatus] = useState<"ok" | "empty" | "error">("ok");
  const onChange = useMemo(() => (value: string) => setQ(value), []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    async function load() {
      if (!online) {
        setSearching(false);
        setStatus("ok");
        return;
      }
      if (category === "Downloaded") {
        setSearching(false);
        setResults([]);
        setStatus("ok");
        return;
      }
      const query = debounced || (category === "Psychology" ? "psychology" : category === "Philosophy" ? "philosophy" : category === "Dark Psychology" ? "machiavelli" : "");
      const url = !query && category === "Classics"
        ? "/api/books?ids=1342,84,2701,11,345,1661,1260,64317,98,174,1727,2554,5200,1232,1497,2680,76,1400,768,36"
        : `/api/books?search=${encodeURIComponent(query || "literature")}`;
      setSearching(true);
      setCatalogNote("");
      setStatus("ok");
      try {
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (ignore) return;
        const found = (data.books || []) as GutenbergBook[];
        setCatalogNote(data.notice || "");
        if (!query && category === "Classics" && !found.length) {
          setResults(CLASSICS);
          setStatus("ok");
          return;
        }
        setResults(found);
        setStatus(data.error ? "error" : found.length ? "ok" : "empty");
      } catch {
        if (ignore) return;
        if (!debounced && category === "Classics") {
          setResults(CLASSICS);
          setStatus("ok");
        } else {
          setResults([]);
          setStatus("error");
        }
      } finally {
        if (!ignore) setSearching(false);
      }
    }
    void load();
    return () => { ignore = true; controller.abort(); };
  }, [debounced, category, online]);

  const downloadedIds = new Set(books.map((book) => book.id));
  const visible = !online || category === "Downloaded"
    ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(debounced.toLowerCase())).map((book) => ({ id: Number(book.id), title: book.title, author: book.author, cover: book.cover, textUrl: null, subjects: [] as string[] }))
    : results;

  return (
    <div className="page">
      <DueBanner />
      {!online ? <div className="banner warn">You are offline - showing downloaded books</div> : null}
      <h1 className="page-title">Hi {username} what shall we read today?</h1>
      <p className="page-sub">Search Project Gutenberg — every title is a full book you can read cover to cover</p>
      <LibrarySearch value={q} onChange={onChange} />
      <div className="cats">
        {["Classics", "Psychology", "Philosophy", "Dark Psychology", `Downloaded (${books.length})`].map((label) => {
          const id = label.startsWith("Downloaded") ? "Downloaded" : label;
          return <button key={label} className={`cat ${category === id ? "on" : ""}`} type="button" onClick={() => setCategory(id)}>{label}</button>;
        })}
      </div>
      {online && (searching || (q.trim() !== debounced && category !== "Downloaded")) ? <LoadingStatus label="🔍 Searching books…" detail={q.trim() ? `Looking for “${q.trim()}”` : "Finding your classics"} /> : null}
      {!searching && catalogNote && online && category !== "Downloaded" ? <p className="banner">{catalogNote}</p> : null}
      {!searching && status === "error" ? <p className="banner warn">The book catalog couldn't be reached. Try again shortly; downloaded books are still available.</p> : null}
      {!searching && (status === "empty" || (category === "Downloaded" && !visible.length)) ? <p className="card">{category === "Downloaded" && !books.length ? "No downloaded books yet. Open a book and choose Download for Offline." : "No books found"}</p> : null}
      <div className="lib-grid">
        {visible.map((book) => (
          <article key={book.id} className="book-card">
            <div className="cover" style={{ background: `linear-gradient(160deg, hsl(${Number(book.id) % 360} 32% 28%), #111)` }}>
              {book.cover ? <img src={book.cover} alt="" /> : <div className="cover-fallback">{book.title}</div>}
            </div>
            <div className="book-body">
              <span className="inline"><span className="badge-book">FULL BOOK</span>{downloadedIds.has(String(book.id)) ? <span className="badge-dl">Downloaded</span> : null}</span>
              <h3>{book.title}</h3>
              <p className="muted">{book.author}</p>
              <button className="btn-primary" type="button" onClick={() => setReaderBook(book)}>Read Now</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function splitChapters(text: string) {
  let body = text;
  const start = body.search(/\*\*\*\s*START OF/);
  const end = body.search(/\*\*\*\s*END OF/);
  if (start >= 0) {
    const nl = body.indexOf("\n", start);
    body = body.slice(nl + 1, end > 0 ? end : undefined);
  }
  const parts = body.split(/\n(?=(?:CHAPTER|Chapter|BOOK|Book|PART|Part|STAVE|Stave)\s+[0-9IVXLCDM]+[^\n]*)/);
  const chapters = parts.map((part, index) => {
    const title = part.trim().split("\n")[0]?.slice(0, 72) || `Part ${index + 1}`;
    return { title, body: part.trim() };
  }).filter((chapter) => chapter.body.length > 80);
  if (chapters.length > 1) return chapters;
  const words = body.split(/\s+/).filter(Boolean);
  const pages = [];
  for (let i = 0; i < words.length; i += 900) pages.push({ title: `Part ${pages.length + 1}`, body: words.slice(i, i + 900).join(" ") });
  return pages.length ? pages : [{ title: "Full text", body: body || "The text is empty." }];
}

export function ReaderOverlay() {
  const { readerBook, setReaderBook, books, saveBook, online, toast } = useApp();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(18);
  const [leading, setLeading] = useState(1.8);
  const [night, setNight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<FileProgress | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<FileProgress | null>(null);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveController = useRef<AbortController | null>(null);
  const saved = books.find((book) => readerBook && book.id === String(readerBook.id));

  useEffect(() => {
    if (!readerBook) return;
    const controller = new AbortController();
    const book = readerBook;
    setIndex(0); setText(""); setError(""); setDownloadProgress(null); setLoadProgress(null);
    const local = books.find((item) => item.id === String(book.id));
    if (local?.text) { setText(local.text); setLoading(false); return; }
    if (!navigator.onLine) { setError("You are offline. This book has not been downloaded."); setLoading(false); return; }
    setLoading(true);
    setLoadProgress({ label: "📖 Opening the full book…" });
    const url = `/api/books/text?id=${book.id}${book.textUrl ? `&url=${encodeURIComponent(book.textUrl)}` : ""}`;
    void fetch(url, { signal: controller.signal })
      .then((r) => readJsonWithProgress<{ text?: string; error?: string }>(r, (p) => { if (!controller.signal.aborted) setLoadProgress(p); }, "📖 Reading the full book…"))
      .then((data) => { if (controller.signal.aborted) return; if (!data.text) throw new Error(data.error || "The book text was empty."); setText(data.text); })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "The book could not be opened."); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setLoadProgress(null); } });
    return () => controller.abort();
    // A download must not reset the chapter the reader is on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerBook?.id, online]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [index, readerBook?.id]);
  useEffect(() => () => saveController.current?.abort(), [readerBook?.id]);
  const chapters = useMemo(() => text ? splitChapters(text) : [], [text]);
  if (!readerBook) return null;
  const chapter = chapters[index];
  async function download() {
    if (!online || !navigator.onLine || !text || saving || !readerBook) return;
    const book = readerBook;
    const controller = new AbortController();
    saveController.current = controller;
    setSaving(true); setError("");
    setDownloadProgress({ label: "⬇️ Downloading book…", percent: 20, detail: "Full text ready · saving the cover for offline use" });
    try {
      let cover: string | null = null;
      try {
        const res = await fetch(`/api/books/cover?id=${book.id}`, { signal: controller.signal });
        if (res.ok) cover = await readFile(await res.blob(), "data", controller.signal) as string;
      } catch { controller.signal.throwIfAborted(); }
      controller.signal.throwIfAborted();
      if (!navigator.onLine) throw new Error("The connection was lost. Connect to the internet to finish downloading.");
      setDownloadProgress({ label: "⬇️ Downloading book…", percent: 80, detail: "Saving full text to this device" });
      await saveBook({ id: String(book.id), title: book.title, author: book.author, cover, text, downloadedAt: Date.now() });
      setDownloadProgress({ label: "Downloaded for offline reading", percent: 100, detail: "All chapters saved on this device" });
      toast("Downloaded for offline reading");
    } catch (err) {
      if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : "Couldn't save the book. Check device storage and try again."); setDownloadProgress(null); }
    } finally { setSaving(false); }
  }
  return (
    <div className={`reader ${night ? "night" : ""}`} role="dialog" aria-label="Book reader">
      <div className="reader-top">
        <button className="btn" type="button" onClick={() => setReaderBook(null)}>Back</button>
        <div className="reader-title">{readerBook.title}</div>
        <button className="btn" type="button" onClick={() => setSize((n) => Math.max(14, n - 1))} aria-label="Smaller text">A-</button>
        <button className="btn" type="button" onClick={() => setSize((n) => Math.min(28, n + 1))} aria-label="Larger text">A+</button>
        <button className="btn" type="button" onClick={() => setLeading((n) => n > 1.9 ? 1.6 : Number((n + 0.2).toFixed(1)))}>Line height</button>
        <button className="btn" type="button" onClick={() => setNight((v) => !v)}>{night ? "Day" : "Night"}</button>
        <button className={`btn dl-blue tip`} type="button" aria-label={saving ? "Downloading book" : saved ? "Downloaded" : "Download for Offline"} disabled={!online || !text || saving || !!saved} data-tip={online ? "Save this book on this device" : "Connect to internet to download"} onClick={() => void download()}>{saving ? <><span className="spinner" /> Downloading book…</> : saved ? "Downloaded" : "Download for Offline"}</button>
        <button className="btn" type="button" onClick={() => setReaderBook(null)}>Close</button>
      </div>
      <div className="reader-body" ref={bodyRef}>
        {loadProgress ? <LoadingStatus {...loadProgress} /> : null}
        {downloadProgress ? <LoadingStatus {...downloadProgress} /> : null}
        <article style={{ ["--fs" as string]: `${size}px`, ["--lh" as string]: String(leading), fontSize: size, lineHeight: leading }}>
          {loading && !loadProgress ? "Opening the full text…" : null}
          {error ? error : null}
          {chapter ? `${chapter.title}\n\n${chapter.body}` : null}
        </article>
      </div>
      <div className="reader-bottom">
        <button className="btn" type="button" disabled={index <= 0} onClick={() => setIndex((n) => Math.max(0, n - 1))}>Previous</button>
        <div className="progress" aria-hidden><span style={{ width: `${chapters.length ? ((index + 1) / chapters.length) * 100 : 0}%` }} /></div>
        <span className="small">{chapters.length ? `${index + 1} / ${chapters.length}` : ""}</span>
        <button className="btn" type="button" disabled={index >= chapters.length - 1} onClick={() => setIndex((n) => Math.min(chapters.length - 1, n + 1))}>Next</button>
      </div>
    </div>
  );
}

export function QuizView() {
  const { books, quizzes, saveQuiz, togglePinQuiz, deleteQuiz } = useApp();
  const [topic, setTopic] = useState("");
  const [bookId, setBookId] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [picks, setPicks] = useState<(number | undefined)[]>([]);
  const [graded, setGraded] = useState(false);
  const [tab, setTab] = useState<"quiz" | "cards" | "test" | "stats">("quiz");
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seconds, setSeconds] = useState(600);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [moreLoading, setMoreLoading] = useState(false);
  const [progress, setProgress] = useState<FileProgress | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const activeTask = useRef<AbortController | null>(null);
  const attemptId = useRef(uid());
  useEffect(() => () => activeTask.current?.abort(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setSeconds((n) => {
        return Math.max(0, n - 1);
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running]);

  function apply(next: QuizQuestion[], name: string) {
    if (next.length < 10) {
      setNote("Not enough verified text to build 10 fair questions. Add more complete sentences to your notes or pick another source.");
      setQuestions([]);
      return;
    }
    setQuestions(next.slice(0, 10));
    attemptId.current = uid();
    setRunning(false);
    setSeconds(600);
    setTitle(name);
    setPicks([]);
    setGraded(false);
    setNote("");
    setCard(0);
    setFlipped(false);
  }

  async function buildQuiz(text: string, name: string, controller: AbortController) {
    if (!isReadableText(text)) throw new Error("The extracted words are not clear enough. Review the notes below or choose a sharper scan.");
    setProgress({ label: "✨ Generating quiz from your notes…", detail: `Analyzing: ${text.split(/\n|(?<=[.!?])\s/).find((l) => l.trim().length > 8)?.slice(0, 120) || name}` });
    const response = await fetch("/api/quiz", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name, text: text.slice(0, 26000) }), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.questions)) throw new Error(data.error || "The quiz could not be generated. Please try again.");
    controller.signal.throwIfAborted();
    apply(data.questions, name);
  }

  async function generate() {
    if (progress) return;
    if (!bookId && !topic.trim() && !sourceText.trim()) { setNote("Choose a topic, a downloaded book, or upload notes first."); return; }
    activeTask.current?.abort();
    const controller = new AbortController();
    activeTask.current = controller;
    setNote("");
    setQuestions([]);
    setProgress({ label: "🔍 Finding study material…" });
    try {
      let text = sourceText;
      let name = sourceName;
      if (bookId) {
        const book = books.find((item) => item.id === bookId);
        if (!book) throw new Error("That book is no longer downloaded.");
        text = book.text; name = book.title;
      } else if (topic.trim()) {
        const res = await fetch(`/api/search?mode=extract&q=${encodeURIComponent(topic)}`, { signal: controller.signal });
        const data = await res.json();
        text = data.extract || ""; name = data.title || topic;
      }
      setSourceText(text); setSourceName(name);
      await buildQuiz(text, name, controller);
    } catch (err) {
      if (!controller.signal.aborted) setNote(err instanceof Error ? err.message : "Something went wrong reading your notes.");
    } finally {
      if (activeTask.current === controller) setProgress(null);
    }
  }

  async function fromFile(file: File) {
    activeTask.current?.abort();
    const controller = new AbortController();
    activeTask.current = controller;
    setNote(""); setQuestions([]); setSourceText(""); setSourceName(file.name); setTopic(""); setBookId("");
    setProgress({ label: "📄 Reading file…", percent: 0, detail: file.name });
    try {
      const result = await extractFile(file, (p) => { if (!controller.signal.aborted) setProgress(p); }, controller.signal);
      controller.signal.throwIfAborted();
      setSourceText(result.text);
      await buildQuiz(result.text, file.name, controller);
    } catch (err) {
      if (!controller.signal.aborted) setNote(err instanceof Error ? err.message : "Could not read this file. Please try a clearer scan.");
    } finally {
      if (activeTask.current === controller) setProgress(null);
    }
  }

  async function moreQuestions() {
    if (moreLoading || !sourceText.trim()) return;
    activeTask.current?.abort();
    const controller = new AbortController();
    activeTask.current = controller;
    setMoreLoading(true);
    setNote("");
    setProgress({ label: "✨ Generating 10 more questions…", detail: "New, different questions from the same notes" });
    try {
      const res = await fetch("/api/quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText.slice(0, 26000), exclude: questions.map((q) => q.question).slice(0, 30) }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions) || data.questions.length < 10) throw new Error(data.error || "The ten new questions could not be generated. Please try again.");
      controller.signal.throwIfAborted();
      setQuestions((prev) => [...prev, ...(data.questions as QuizQuestion[]).slice(0, 10)]);
      setPicks((prev) => { const next = [...prev]; while (next.length < prev.length + 10) next.push(undefined); return next; });
      setGraded(false);
      setCard(0); setFlipped(false);
    } catch (err) {
      if (!controller.signal.aborted) setNote(err instanceof Error ? err.message : "The ten new questions could not be generated.");
    } finally {
      setMoreLoading(false);
      if (activeTask.current === controller) { setProgress(null); activeTask.current = null; }
    }
  }

  function grade(answers: (number | undefined)[] = picks) {
    if (!questions.length || graded) return;
    setGraded(true); setRunning(false);
    const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0), 0);
    void saveQuiz({ id: attemptId.current, title, questions, score, total: questions.length, createdAt: Date.now(), pinned: false, mode: tab === "test" ? "practice" : "quiz" });
  }
  const gradeRef = useRef(grade);
  gradeRef.current = grade;
  useEffect(() => { if (running && seconds === 0) gradeRef.current(); }, [running, seconds]);

  const score = questions.reduce((sum, q, i) => sum + (picks[i] === q.answer ? 1 : 0), 0);
  const avg = quizzes.length ? Math.round(quizzes.reduce((sum, q) => sum + (q.total ? (q.score / q.total) * 100 : 0), 0) / quizzes.length) : 0;
  const best = quizzes.length ? Math.max(...quizzes.map((q) => (q.total ? Math.round((q.score / q.total) * 100) : 0))) : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="page">
      <div className="inline" style={{ justifyContent: "space-between" }}><h1 className="page-title">Quiz studio</h1><button className="btn" type="button" onClick={() => { activeTask.current?.abort(); setProgress(null); setQuestions([]); setPicks([]); setGraded(false); setRunning(false); setNote(""); setSourceText(""); setTopic(""); setTab("quiz"); }}>New Quiz</button></div>
      <p className="page-sub">Ten conceptual multiple-choice questions from your notes, a downloaded book, or a verified public source. Nothing is invented to fill a blank.</p>
      <div className="cats">
        {(["quiz", "cards", "test", "stats"] as const).map((item) => <button key={item} className={`cat ${tab === item ? "on" : ""}`} type="button" onClick={() => setTab(item)}>{item === "cards" ? "Flashcards" : item === "test" ? "Practice test" : item === "stats" ? "Stats" : "Quiz"}</button>)}
      </div>
      <div className="inline">
        <input className="textin" style={{ maxWidth: 280 }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" aria-label="Quiz topic" />
        <select className="textin" style={{ maxWidth: 260 }} value={bookId} onChange={(e) => setBookId(e.target.value)} aria-label="Downloaded book">
          <option value="">Downloaded library book</option>
          {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
        </select>
        <button className="btn-primary" type="button" disabled={!!progress} onClick={() => void generate()}>Generate</button>
        <button className="btn" type="button" disabled={!!progress} onClick={() => fileRef.current?.click()}>Upload notes</button>
        <input ref={fileRef} hidden type="file" accept=".pdf,.txt,.md,image/*,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromFile(f); e.target.value = ""; }} />
      </div>
      {progress ? <div className="quiz-processing"><LoadingStatus {...progress} /><button className="btn" type="button" onClick={() => { activeTask.current?.abort(); setProgress(null); setNote("Canceled. Choose a file when you're ready."); }}>Cancel</button></div> : null}
      {note ? <p className="banner warn" role="alert" style={{ marginTop: 12 }}>{note}</p> : null}
      {sourceText && !progress ? <details className="source-review"><summary>Review extracted notes · {sourceName}</summary><textarea className="textin" aria-label="Extracted notes" value={sourceText} onChange={(e) => setSourceText(e.target.value)} /><button className="btn" type="button" onClick={() => { setTopic(""); setBookId(""); const c = new AbortController(); activeTask.current = c; void buildQuiz(sourceText, sourceName, c).catch((e) => setNote(e.message)).finally(() => setProgress(null)); }}>Regenerate from edited notes</button></details> : null}
      {tab === "stats" ? (
        <>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <article className="card"><h3>Total quizzes</h3><p className="page-title">{quizzes.length}</p></article>
            <article className="card"><h3>Average score</h3><p className="page-title">{avg}%</p></article>
            <article className="card"><h3>Best score</h3><p className="page-title">{best}%</p></article>
            <article className="card"><h3>Practice tests</h3><p className="page-title">{quizzes.filter((q) => q.mode === "practice").length}</p></article>
          </div>
          <h2 style={{ margin: "22px 0 8px" }}>Recent attempts</h2>
          {quizzes.slice(0, 8).map((quiz) => (
            <div key={quiz.id} className="list-row card">
              <span style={{ flex: 1 }}>
                <strong>{quiz.title || "Untitled quiz"}</strong>
                <span className="muted small" style={{ display: "block" }}>{formatWhen(quiz.createdAt)} · {quiz.score}/{quiz.total} · {quiz.mode === "practice" ? "practice test" : "quiz"}</span>
              </span>
              <button className="mini" type="button" aria-label="Delete attempt" onClick={() => void deleteQuiz(quiz.id)}>🗑️</button>
            </div>
          ))}
          {!quizzes.length ? <p className="muted">No attempts yet. Generate a quiz to start collecting stats.</p> : null}
        </>
      ) : null}
      {tab === "quiz" ? (
        <>
          <h2 style={{ margin: "22px 0 8px" }}>My quizzes</h2>
          {quizzes.length ? quizzes.slice(0, 8).map((quiz) => (
            <div key={`list-${quiz.id}`} className="list-row card">
              <span style={{ flex: 1 }}>
                <strong>{quiz.title || "Untitled quiz"}</strong>
                <span className="muted small" style={{ display: "block" }}>{formatWhen(quiz.createdAt)} · {quiz.score}/{quiz.total}</span>
              </span>
              <button className="btn" type="button" onClick={() => { setQuestions(quiz.questions); setTitle(quiz.title); setPicks([]); setGraded(false); setTab("cards"); setCard(0); setFlipped(false); }}>Review</button>
              <button className="btn" type="button" onClick={() => void togglePinQuiz(quiz.id)}>{quiz.pinned ? "Unpin" : "Pin"}</button>
              <button className="mini" type="button" aria-label="Delete quiz" onClick={() => void deleteQuiz(quiz.id)}>🗑️</button>
            </div>
          )) : <p className="muted">No quizzes saved yet.</p>}
        </>
      ) : null}
      {tab === "cards" && questions[card] ? (
        <div className={`flip ${flipped ? "flipped" : ""}`} style={{ marginTop: 16 }} onClick={() => setFlipped((v) => !v)}>
          <div className="flip-inner">
            <div className="face">{questions[card].question}</div>
            <div className="face back"><strong>{questions[card].options[questions[card].answer]}</strong><p>{questions[card].explanation}</p></div>
          </div>
          <div className="inline" style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={(e) => { e.stopPropagation(); setFlipped(false); setCard((n) => Math.max(0, n - 1)); }}>Previous</button>
            <button className="btn" type="button" onClick={(e) => { e.stopPropagation(); setFlipped(false); setCard((n) => Math.min(questions.length - 1, n + 1)); }}>Next</button>
          </div>
        </div>
      ) : null}
      {(tab === "quiz" || tab === "test") && questions.length ? (
        <div style={{ marginTop: 16 }}>
          {tab === "test" ? (
            <div className="inline" style={{ marginBottom: 8 }}>
              <strong>{mm}:{ss}</strong>
              {!running && !graded ? <button className="btn" type="button" onClick={() => { setSeconds(600); setRunning(true); setGraded(false); }}>Start 10:00</button> : null}
            </div>
          ) : null}
          <p className="muted small" style={{ marginBottom: 8 }}>Question {Math.min(questions.length, picks.filter((v) => Number.isInteger(v)).length + 1)} of {questions.length} · each answer locks when you choose it.</p>
          {questions.map((question, qi) => {
            const chosen = picks[qi];
            const answered = Number.isInteger(chosen);
            return (
              <article key={question.question} className="card" style={{ marginBottom: 12 }}>
                <strong>{qi + 1}. {question.question}</strong>
                {question.options.map((option, oi) => {
                  const isChosen = chosen === oi;
                  const cls = graded && oi === question.answer ? "q-option right" : graded && isChosen ? "q-option wrong" : answered && isChosen ? "q-option selected" : "q-option";
                  const mark = graded && oi === question.answer ? "✓ Correct" : graded && isChosen ? "✗ Wrong" : isChosen ? "✓ Selected" : null;
                  return (
                    <button
                      key={option}
                      className={cls}
                      type="button"
                      disabled={answered}
                      aria-pressed={isChosen}
                      onClick={() => {
                        if (answered) return;
                        const next = [...picks] as (number | undefined)[];
                        next[qi] = oi;
                        setPicks(next);
                        if (tab === "quiz" && next.length === questions.length && next.every((v) => Number.isInteger(v))) grade(next);
                      }}
                    >
                      <span style={{ overflowWrap: "anywhere" }}>{option}</span>
                      {mark ? <span className={`q-mark ${graded ? (oi === question.answer ? "right" : "wrong") : "sel"}`}>{mark}</span> : null}
                    </button>
                  );
                })}
                {graded ? <p className="q-expl muted" style={{ marginTop: 8 }}>{question.explanation}</p> : null}
              </article>
            );
          })}
          {!graded ? <button className="btn-primary" type="button" disabled={picks.length !== questions.length || !picks.every((v) => Number.isInteger(v))} onClick={() => grade()}>Grade</button> : (
            <div className="quiz-result card" role="status">
              <p style={{ fontSize: 18 }}>🎉 You scored {score} / {questions.length}</p>
              <div className="inline">
                <button className="btn" type="button" onClick={() => setTab("cards")}>Review</button>
                <button className="btn" type="button" onClick={() => { setPicks([]); setGraded(false); setRunning(false); setSeconds(600); }}>Retake</button>
              </div>
              <div className="more-block">
                <span>Want more practice?</span>
                <button className="btn-more" type="button" disabled={moreLoading || !sourceText.trim()} onClick={() => void moreQuestions()}>
                  {moreLoading ? <><span className="spinner" aria-hidden="true" /> ✨ Generating 10 more questions…</> : "More questions? Generate 10 more"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function VoiceView() {
  const { saveVoice, voiceHistory, toast } = useApp();
  const [live, setLive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const finalRef = useRef("");

  function start(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      toast("Speech recognition is not available in this browser. Type your question below.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    rec.onresult = (ev) => {
      const text = Array.from(ev.results).map((row) => row[0].transcript).join(" ");
      finalRef.current = text;
      setTranscript(text);
    };
    rec.onend = () => setLive(false);
    recRef.current = rec;
    setLive(true);
    rec.start();
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  async function stop() {
    recRef.current?.stop();
    recRef.current = null;
    setLive(false);
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    const text = (finalRef.current || transcript).trim();
    if (!text) return;
    setBusy(true);
    setResponse("Real answers only — nothing is made up");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: text }] }) });
      const data = await res.json();
      const content = data.content || "I couldn't reach a source just now, so I won't invent an answer.";
      setResponse(content);
      await saveVoice({ id: uid(), transcript: text, response: content, createdAt: Date.now() });
      if (typeof window.speechSynthesis !== "undefined") {
        const utter = new SpeechSynthesisUtterance(content.slice(0, 600));
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ textAlign: "center" }}>
      <h1 className="page-title">Voice tutor</h1>
      <p className="page-sub" style={{ marginInline: "auto" }}>Hold the button, speak, then release. Sage answers out loud and saves the exchange.</p>
      <button className={`hold-btn ${live ? "live" : ""}`} type="button" onPointerDown={start} onPointerUp={() => void stop()} onPointerCancel={() => void stop()}>
        {live ? "Listening" : "Hold to Talk"}
      </button>
      {live ? <div className="wave" style={{ marginTop: 16 }}>{[0, 1, 2, 3, 4].map((n) => <i key={n} />)}</div> : null}
      <p style={{ marginTop: 16 }}>{transcript}</p>
      {busy || response ? <article className="card" style={{ textAlign: "left", marginTop: 12, whiteSpace: "pre-wrap" }}>{response}</article> : null}
      {response ? (
        <div className="inline" style={{ justifyContent: "center", marginTop: 8 }}>
          <button className="btn" type="button" onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance(response.slice(0, 600)))}>Play</button>
          <button className="btn" type="button" onClick={() => window.speechSynthesis.pause()}>Pause</button>
          <button className="btn" type="button" onClick={() => window.speechSynthesis.resume()}>Resume</button>
          <button className="btn" type="button" onClick={() => window.speechSynthesis.cancel()}>Stop</button>
        </div>
      ) : null}
      <label className="field" style={{ textAlign: "left", marginTop: 16 }}>Or type what you would say
        <textarea value={transcript} onChange={(e) => { setTranscript(e.target.value); finalRef.current = e.target.value; }} />
      </label>
      <button className="btn" type="button" onClick={() => void stop()}>Send typed question</button>
      <h2 style={{ margin: "28px 0 10px", textAlign: "left" }}>Voice history</h2>
      <div className="list" style={{ textAlign: "left" }}>
        {voiceHistory.map((item) => (
          <article key={item.id} className="card">
            <strong>{item.transcript}</strong>
            <p className="muted" style={{ whiteSpace: "pre-wrap" }}>{item.response.slice(0, 280)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: Event & { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

export function PlannerView() {
  const { tasks, saveTask, toggleTask, books, plans, savePlan, preset, xp, streak, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [due, setDue] = useState(todayISO());
  const [bookId, setBookId] = useState("");
  const [priority, setPriority] = useState<"high" | "med" | "low">("med");
  const [subjects, setSubjects] = useState(preset);
  const [plan, setPlan] = useState<ReturnType<typeof buildTimetable> | null>(null);
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first + days }, (_, i) => (i < first ? null : i - first + 1));

  function addTask() {
    if (!name.trim()) return;
    void saveTask({ id: uid(), name: name.trim(), dueDate: due, bookId: bookId || null, priority, done: false, createdAt: Date.now() });
    setOpen(false);
    setName("");
    toast("Task saved");
  }

  const groups = [
    ["Today", tasks.filter((task) => task.dueDate === todayISO())],
    ["Tomorrow", tasks.filter((task) => task.dueDate === addDaysISO(1))],
    ["Upcoming", tasks.filter((task) => task.dueDate > addDaysISO(1))],
  ] as const;

  return (
    <div className="page">
      <div className="inline" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Study planner</h1>
          <p className="page-sub">Streak {streak} · {xp} XP</p>
        </div>
        <button className="btn-primary no-print" type="button" onClick={() => setOpen(true)}>Add Task</button>
      </div>
      <div className="inline no-print" style={{ marginBottom: 8 }}>
        <button className="btn" type="button" onClick={() => setCursor(new Date(year, month - 1, 1))}>Prev</button>
        <strong>{cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}</strong>
        <button className="btn" type="button" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next</button>
      </div>
      <div className="cal-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="muted small">{d}</div>)}
        {cells.map((day, index) => {
          const iso = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
          const count = tasks.filter((task) => task.dueDate === iso).length;
          return <div key={index} className={`cal-cell ${iso === todayISO() ? "on" : ""}`}>{day ? <><div className="n">{day}</div>{count ? <span className="muted">{count} task{count > 1 ? "s" : ""}</span> : null}</> : null}</div>;
        })}
      </div>
      {groups.map(([label, rows]) => (
        <section key={label}>
          <h2 style={{ margin: "18px 0 6px" }}>{label}</h2>
          {rows.map((task) => (
            <label key={task.id} className="task-row">
              <input className="checkline" type="checkbox" checked={task.done} onChange={() => void toggleTask(task.id)} />
              <span>
                <strong className={task.done ? "muted" : ""} style={{ textDecoration: task.done ? "line-through" : "none" }}>{task.name}</strong>
                <span className={`small pri-${task.priority}`} style={{ display: "block" }}>{task.priority} · {task.dueDate}{task.bookId ? ` · ${books.find((b) => b.id === task.bookId)?.title || "book"}` : ""}</span>
              </span>
            </label>
          ))}
          {!rows.length ? <p className="muted">Nothing here.</p> : null}
        </section>
      ))}
      <h2 style={{ margin: "24px 0 8px" }}>Study timetable</h2>
      <form className="inline no-print" onSubmit={(e) => {
        e.preventDefault();
        const next = buildTimetable(parseSubjects(subjects));
        setPlan(next);
        void savePlan({ id: uid(), kind: "timetable", title: subjects.slice(0, 40) || "Week plan", body: JSON.stringify(next), createdAt: Date.now() });
        toast("Timetable saved");
      }}>
        <input className="textin" style={{ maxWidth: 460 }} value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Math 5, Biology 3, History 2" aria-label="Subjects and hours" />
        <button className="btn-primary" type="submit">Build week</button>
      </form>
      {plan ? (
        <div className="print-area" style={{ marginTop: 12 }}>
          {plan.map((day) => (
            <article key={day.day} className="card" style={{ marginBottom: 8 }}>
              <strong>{day.day}</strong>
              {day.blocks.map((block) => <p key={block.time + block.title}>{block.time} · {block.title} — {block.note}</p>)}
            </article>
          ))}
          <div className="inline no-print">
            <button className="btn" type="button" onClick={() => window.print()}>Print</button>
            <button className="btn" type="button" onClick={() => {
              const blob = new Blob([timetableToIcs(plan)], { type: "text/calendar" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "sage-week.ics"; a.click();
              URL.revokeObjectURL(url);
            }}>Add to calendar</button>
          </div>
        </div>
      ) : null}
      {plans.length ? <p className="muted small" style={{ marginTop: 8 }}>{plans.length} saved plan{plans.length === 1 ? "" : "s"} on this device.</p> : null}
      {open ? (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); addTask(); }}>
            <h3>Add task</h3>
            <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
            <label className="field">Due date<input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
            <label className="field">Book from library
              <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
                <option value="">None</option>
                {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
              </select>
            </label>
            <label className="field">Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as "high" | "med" | "low")}>
                <option value="high">High</option>
                <option value="med">Med</option>
                <option value="low">Low</option>
              </select>
            </label>
            <div className="inline"><button className="btn-primary" type="submit">Save</button><button className="btn" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileView() {
  const { username, setUsername, email, setEmail, avatar, setAvatar } = useApp();
  const [name, setName] = useState(username);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>
      <div className="card" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        {avatar ? <img className="avatar-lg" src={avatar} alt="" /> : <div className="avatar-lg">{username.slice(0, 2).toUpperCase()}</div>}
        <div>
          <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => void setAvatar(String(reader.result));
            reader.readAsDataURL(file);
          }} />
          <div className="inline">
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Upload picture</button>
            {avatar ? <button className="btn" type="button" onClick={() => void setAvatar(null)}>Remove picture</button> : null}
          </div>
          <label className="field" style={{ marginTop: 12 }}>Username
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setUsername(name)} />
          </label>
          <label className="field">Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <p className="muted small">Shown as Hi {username} in the library, and in the header.</p>
        </div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { themeId, setThemeId, colorMode, setColorMode, notifications, setNotifications, clearStorage, exportData, avatar, setAvatar, username, setUsername } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(username);
  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <div className="card" style={{ marginBottom: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        {avatar ? <img className="avatar-lg" src={avatar} alt="" /> : <div className="avatar-lg">{username.slice(0, 2).toUpperCase()}</div>}
        <div style={{ flex: 1, minWidth: 240 }}>
          <h3>Profile</h3>
          <p className="muted small" style={{ margin: "4px 0 10px" }}>Your picture and name appear everywhere: hi messages, sidebar, and header.</p>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => void setAvatar(String(reader.result));
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
          <div className="inline" style={{ marginBottom: 10 }}>
            <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Upload picture</button>
            {avatar ? <button className="btn" type="button" onClick={() => void setAvatar(null)}>Remove picture</button> : null}
          </div>
          <label className="field" style={{ marginBottom: 0 }}>
            Username
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setUsername(name)} aria-label="Username" />
          </label>
          <p className="muted small" style={{ marginTop: 6 }}>Shown as Hi {username} in the library.</p>
        </div>
      </div>

      <h3 style={{ margin: "8px 0 10px" }}>Theme</h3>
      <div className="inline" style={{ marginBottom: 16 }}>
        {(["light", "dark", "system"] as const).map((mode) => (
          <button key={mode} className={`cat ${colorMode === mode ? "on" : ""}`} type="button" onClick={() => setColorMode(mode)}>{mode}</button>
        ))}
        <span className="muted small">{THEMES.length} themes</span>
      </div>
      <div className="theme-grid">
        {THEMES.map((theme) => (
          <button key={theme.id} className={`swatch ${themeId === theme.id ? "on" : ""}`} type="button" onClick={() => setThemeId(theme.id)}>
            <span className="swatch-bars">
              <span style={{ background: theme.sidebarBg }} />
              <span style={{ background: theme.primary }} />
              <span style={{ background: theme.bg }} />
            </span>
            {theme.name}
          </button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <label className="inline"><input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} /> Notifications</label>
        <div className="inline" style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => void exportData()}>Export data</button>
          <button className="btn-danger" type="button" onClick={() => { if (window.confirm("Clear saved study data on this device?")) void clearStorage(); }}>Clear storage</button>
        </div>
      </div>
    </div>
  );
}

export function GuideView() {
  const items = [
    ["New chat", "Starts a fresh chat, titles it from the first 30 characters, and keeps it in history after refresh."],
    ["Ask Sage", "Sends to the study tutor. The loading line means the answer is grounded, not invented. Attach notes with +."],
    ["Pinned and Recents", "Pin chats you want close. Recents groups what you opened Today, Yesterday, or Older."],
    ["Writing pad", "Pick a template, write in the full-screen editor, and export a PDF. It saves every two seconds."],
    ["Research trail", "Enter a topic and watch the trail: sources, a summary, and follow-up questions."],
    ["Harvest board", "Pins and filters writing, research, and quizzes you have saved."],
    ["Library", "Search Project Gutenberg, read the full book, and download it for offline. Downloads need a connection."],
    ["Quiz studio", "Generate five questions from notes, a downloaded book, or a public source. Flashcards flip. Practice test runs for 10 minutes."],
    ["Voice tutor", "Hold the gold button to talk. Release to hear a spoken reply."],
    ["Study planner", "Add tasks, check them for XP, and build a printable week."],
    ["Socratic tutor", "Work mode asks questions. The hint button never gives the final answer."],
    ["Download app", "Installs Sage to your desktop or home screen when the browser allows it."],
  ];
  return (
    <div className="page">
      <h1 className="page-title">Guide</h1>
      <p className="page-sub">How to use each tool in Sage.</p>
      <div className="list">
        {items.map(([title, body]) => (
          <article key={title} className="card"><h3>{title}</h3><p className="muted" style={{ marginTop: 6 }}>{body}</p></article>
        ))}
      </div>
    </div>
  );
}
