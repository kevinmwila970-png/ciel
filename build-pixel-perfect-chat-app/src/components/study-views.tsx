"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "./Composer";
import { Markdown } from "./Markdown";
import { ChatPending, LoadingStatus } from "./LoadingStatus";
import { extractFile, fileSize } from "@/lib/files";
import { Icon } from "./icons";
import { useApp } from "@/lib/store";
import { buildAppReport, buildTutoringPlan, checkStructure, formatWhen, groupLabel, homeworkPrompts, ownWorkHint, TEMPLATE_META, todayISO, uid } from "@/lib/study";
import type { ChatAttachment, Research, WritingDoc, WritingTemplate } from "@/lib/types";

export function DueBanner() {
  const { tasks, setView } = useApp();
  const due = tasks.filter((task) => !task.done && task.dueDate === todayISO());
  if (!due.length) return null;
  return (
    <button className="banner warn" onClick={() => setView("planner")}>
      {due.length} task{due.length === 1 ? "" : "s"} due today — open the planner.
    </button>
  );
}

export function HomeChat() {
  const app = useApp();
  const input = app.draft;
  const setDraft = app.setDraft;
  const onChange = useCallback((value: string) => setDraft(value), [setDraft]);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  // draft lives in the store so New chat can clear it
  const chat = app.chats.find((item) => item.id === app.activeChatId) ?? null;
  const empty = !chat || chat.messages.length === 0;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [chat?.messages.length, app.busy]);

  function send(text: string, attachment?: ChatAttachment) {
    if (attachment) {
      void app.sendChat(text, attachment);
      app.setDraft("");
      return;
    }
    if (app.composerMode === "explain") {
      app.setPreset(text);
      app.setView("explain");
      return;
    }
    if (app.composerMode === "search") {
      app.setPreset(text);
      app.setView("search");
      return;
    }
    if (app.composerMode === "timetable") {
      app.setPreset(text);
      app.setView("planner");
      return;
    }
    void app.sendChat(text);
    app.setDraft("");
  }

  return (
    <div className={`${empty ? "stage" : "thread-wrap"} chat-surface`}
      onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); dragDepth.current++; setDragging(true); } }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } }}
      onDragLeave={(e) => { e.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); const file = e.dataTransfer.files[0]; if (file && !app.busy) setDroppedFile(file); }}
    >
      {dragging ? <div className="chat-drop-overlay"><Icon name="upload" size={28} /><strong>Drop your image, PDF, or notes here</strong><span>Attach it to your next message</span></div> : null}
      {empty ? (
        <div className="hero">
          <DueBanner />
          <p className="eyebrow">Socratic AI study tutor that teaches you how to think, not what to think.</p>
          <h1 className="hero-title">What’s on your mind today?</h1>
          <p className="lede">Sage - A room for curious minds. Socratic AI study tutor that teaches you how to think, not what to think. Writing Pad, Research Trail, Library.</p>
        </div>
      ) : (
        <div>
          <div className="row-actions no-print">
            <strong>{chat?.title}</strong>
            <button className="btn" type="button" onClick={() => chat && app.togglePinChat(chat.id)}>{chat?.pinned ? "Unpin" : "Pin"}</button>
            <button className="btn" type="button" onClick={() => {
              const title = window.prompt("Rename chat", chat?.title || "");
              if (title && chat) app.renameChat(chat.id, title);
            }}>Rename</button>
            <button className="btn" type="button" onClick={() => chat && void app.deleteChat(chat.id)}>Delete</button>
          </div>
          <div className="thread">
            {chat?.messages.map((message, index) => (
              <div key={`${message.timestamp}-${index}`} className={`bubble ${message.role} ${message.pending ? "pending" : ""}`}>
                {message.pending ? (
                  <ChatPending timestamp={message.timestamp} image={chat?.messages[index - 1]?.attachments?.find((a) => a.kind === "image")} />
                ) : message.role === "assistant" ? (
                  <Markdown text={message.content} />
                ) : (
                  <>
                    {message.attachments?.map((attachment) => attachment.kind === "image" && attachment.dataUrl ? (
                      <figure className="chat-image" key={attachment.id}>
                        <a href={attachment.dataUrl} target="_blank" rel="noreferrer" aria-label={`Open ${attachment.name}`}><img src={attachment.dataUrl} alt={attachment.name} /></a>
                        <figcaption>{attachment.name} · {fileSize(attachment.size)}</figcaption>
                      </figure>
                    ) : (
                      <div className="chat-file" key={attachment.id}>📄 <strong>{attachment.name}</strong><span>{attachment.pageCount ? `${attachment.pageCount} pages · ` : ""}{fileSize(attachment.size)}</span></div>
                    ))}
                    <span>{message.content}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      )}
      <div className={empty ? "home-composer" : "composer-bar"}>
        <Composer value={input} onChange={onChange} onSend={send} mode={app.composerMode} onMode={app.setComposerMode} busy={app.busy} droppedFile={droppedFile} resetId={app.activeChatId} />
      </div>
      {empty ? (
        <>
          <div className="chips">
            <button className="chip" type="button" onClick={() => { app.setPreset(input); app.setView("explain"); }}><Icon name="leaf" size={16} /> Explain a concept</button>
            <button className="chip" type="button" onClick={() => { app.setPreset(input); app.setView("planner"); }}><Icon name="calendar" size={16} /> Study timetable</button>
            <button className="chip" type="button" onClick={() => { app.setPreset(input); app.setView("search"); }}><Icon name="globe" size={16} /> Search the web</button>
          </div>
          <div className="studio-head">
            <div>
              <div className="studio-kicker"><Icon name="leaf" size={16} /> SAGE STUDY STUDIO</div>
              <p className="studio-note">Real tools, not prompts in disguise. Everything you make is saved on this device.</p>
            </div>
            <span className="tool-count">6 tools</span>
          </div>
          <div className="tool-grid">
            <Tool icon="cap" title="Explain a concept" text="A step-by-step walkthrough, with an analogy and a check." onClick={() => app.setView("explain")} />
            <Tool icon="calendar" title="Study timetable" text="A realistic weekly plan you can print or add to your calendar." onClick={() => app.setView("planner")} />
            <Tool icon="clip" title="Tutoring plan" text="A session-by-session plan built around the learner’s goal." onClick={() => app.setView("tutoring")} />
            <Tool icon="target" title="Quiz from notes" text="Turn your notes into an interactive quiz with explanations." onClick={() => app.setView("quiz")} />
            <Tool icon="upload" title="Homework helper" text="Upload a PDF, image, or notes file and work through it." onClick={() => app.setView("homework")} />
            <Tool icon="book" title="App report" text="A structured product report ready to edit and share." onClick={() => app.setView("report")} />
          </div>
          <div className="more-tools no-print">
            <span className="muted small">More practice</span>
            <button className="chip" type="button" onClick={() => app.setView("voice")}><Icon name="mic" size={15} /> Voice tutor</button>
            <button className="chip" type="button" onClick={() => app.setView("planner")}><Icon name="calendar" size={15} /> Study planner</button>
            <button className="chip" type="button" onClick={() => app.setView("socratic")}><Icon name="leaf" size={15} /> Socratic tutor</button>
          </div>
        </>
      ) : (
        <div className="more-tools no-print" style={{ marginTop: 8 }}>
          <span className="muted small">Tools</span>
          <button className="chip" type="button" onClick={() => app.setView("explain")}><Icon name="cap" size={15} /> Explain</button>
          <button className="chip" type="button" onClick={() => app.setView("tutoring")}><Icon name="clip" size={15} /> Tutoring plan</button>
          <button className="chip" type="button" onClick={() => app.setView("homework")}><Icon name="upload" size={15} /> Homework</button>
          <button className="chip" type="button" onClick={() => app.setView("report")}><Icon name="book" size={15} /> Report</button>
          <button className="chip" type="button" onClick={() => app.setView("voice")}><Icon name="mic" size={15} /> Voice</button>
          <button className="chip" type="button" onClick={() => app.setView("search")}><Icon name="globe" size={15} /> Search</button>
        </div>
      )}
    </div>
  );
}

function Tool({ icon, title, text, onClick }: { icon: string; title: string; text: string; onClick: () => void }) {
  return (
    <button className="tool-card" type="button" onClick={onClick}>
      <span className="tool-ico"><Icon name={icon} size={16} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
    </button>
  );
}

export function HistoryView() {
  const { chats, openChat, renameChat, deleteChat, newChat } = useApp();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);
  const filtered = chats.filter((chat) => {
    const blob = `${chat.title} ${chat.messages.map((m) => m.content).join(" ")}`.toLowerCase();
    return blob.includes(debounced.toLowerCase());
  });
  const groups: Array<"Today" | "Yesterday" | "Older"> = ["Today", "Yesterday", "Older"];
  function previewOf(chat: (typeof chats)[number]): string {
    const assistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.content && !m.pending);
    const user = chat.messages.find((m) => m.role === "user");
    const text = (assistant?.content || user?.content || "No messages yet").replace(/\s+/g, " ").trim();
    return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  }
  return (
    <div className="page">
      <h1 className="page-title">Chat history</h1>
      <p className="page-sub">{chats.length ? `${chats.length} chat${chats.length === 1 ? "" : "s"} saved on this device.` : "Conversations you start appear here."}</p>
      <div className="lib-search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
        {q ? <button className="clear" type="button" onClick={() => setQ("")} aria-label="Clear">×</button> : null}
      </div>
      {!chats.length ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.6 }}>
          <p style={{ fontSize: 18 }}>📭 No chat history yet</p>
          <p style={{ fontSize: 12, marginTop: 8, color: "var(--muted)" }}>Start a new chat to see it here</p>
          <button type="button" onClick={newChat} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, background: "#EAB54D", color: "#000", border: 0, fontWeight: 700, cursor: "pointer" }}>Start New Chat</button>
        </div>
      ) : null}
      {chats.length > 0 && filtered.length === 0 ? <p className="muted small" style={{ marginTop: 12 }}>No chats match “{debounced}”.</p> : null}
      {groups.map((label) => {
        const rows = filtered.filter((chat) => groupLabel(chat.updatedAt) === label);
        if (!rows.length) return null;
        return (
          <section key={label}>
            <div className="group-label">{label}</div>
            <div className="list">
              {rows.map((chat) => (
                <div key={chat.id} className="list-row card" style={{ padding: 10 }}>
                  {renameId === chat.id ? (
                    <form className="inline" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); renameChat(chat.id, draft); setRenameId(null); }}>
                      <input className="textin" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Rename chat" />
                      <button className="btn-primary" type="submit">Save</button>
                    </form>
                  ) : (
                    <button className="list-row" type="button" onClick={() => openChat(chat.id)} style={{ flex: 1 }}>
                      <span style={{ display: "block", minWidth: 0 }}>
                        <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chat.title}</strong>
                        <span className="muted small" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatWhen(chat.updatedAt)} · {previewOf(chat)}</span>
                      </span>
                    </button>
                  )}
                  <span className="hover-actions">
                    <button className="mini" type="button" aria-label="Rename" onClick={() => { setRenameId(chat.id); setDraft(chat.title); }}>✏️</button>
                    <button className="mini" type="button" aria-label="Delete" onClick={() => void deleteChat(chat.id)}>🗑️</button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SocraticView() {
  const { toast } = useApp();
  const [input, setInput] = useState("");
  const onChange = useCallback((value: string) => setInput(value), []);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(hint = false) {
    const text = input.trim();
    if (!hint && !text) return;
    const next = hint ? messages : [...messages, { role: "user" as const, content: text }];
    if (!hint) {
      setMessages([...next, { role: "assistant", content: "Real answers only — nothing is made up" }]);
      setInput("");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, hint, topic: text || messages.at(-1)?.content || "this idea" }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      const reply = data.content || data.error || "Ask a smaller question, and we will keep going.";
      setMessages(hint ? [...messages, { role: "assistant", content: reply }] : [...next, { role: "assistant", content: reply }]);
    } catch {
      toast("Could not reach the tutor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="thread-wrap">
      <p className="eyebrow">Socratic tutor</p>
      <h1 className="hero-title" style={{ fontSize: 32, textAlign: "left" }}>Questions, not answers.</h1>
      <p className="page-sub">I will ask you to think. The hint button gives a nudge, never the solution.</p>
      <div className="thread">
        {messages.map((message, index) => (
          <div key={index} className={`bubble ${message.role}`}>{message.content}</div>
        ))}
      </div>
      <div className="inline" style={{ marginBottom: 8 }}>
        <button className="btn" type="button" disabled={busy} onClick={() => void ask(true)}>Give me a hint</button>
      </div>
      <Composer value={input} onChange={onChange} onSend={() => void ask(false)} mode="auto" onMode={() => undefined} busy={busy} placeholder="What are you trying to figure out?" />
    </div>
  );
}

export function ExplainView() {
  const { preset, setPreset } = useApp();
  const [concept, setConcept] = useState(preset);
  const [body, setBody] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);
  async function run(q: string) {
    if (!q.trim()) return;
    setBusy(true);
    setBody("Real answers only — nothing is made up");
    const res = await fetch(`/api/search?mode=explain&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setBody(data.content || data.error || "No verified source found.");
    setSources(data.sources || []);
    setBusy(false);
  }
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (preset.trim()) {
      setConcept(preset);
      void run(preset);
      setPreset("");
    }
  }, [preset, setPreset]);
  return (
    <div className="page">
      <h1 className="page-title">Explain a concept</h1>
      <p className="page-sub">A step-by-step walkthrough, with an analogy and a check. Grounded in a public source.</p>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); void run(concept); }}>
        <input className="textin" style={{ maxWidth: 420 }} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concept, e.g. photosynthesis" aria-label="Concept" />
        <button className="btn-primary" disabled={busy} type="submit">Walk through it</button>
      </form>
      {body ? <article className="card" style={{ marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{body}</article> : null}
      {sources.length ? <div className="sources" style={{ marginTop: 10 }}>{sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}</div> : null}
    </div>
  );
}

export function SearchView() {
  const { preset, setPreset } = useApp();
  const [q, setQ] = useState(preset);
  const [body, setBody] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string; snippet?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  async function run(query: string) {
    if (!query.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/search?mode=search&q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setBody(data.content || data.error || "No public summary found.");
    setSources(data.sources || []);
    setBusy(false);
  }
  useEffect(() => {
    if (preset.trim()) {
      setQ(preset);
      void run(preset);
      setPreset("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="page">
      <h1 className="page-title">Search the web</h1>
      <p className="page-sub">A short summary plus source links. If nothing verified comes back, Sage says so.</p>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); void run(q); }}>
        <input className="textin" style={{ maxWidth: 480 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a topic" aria-label="Search query" />
        <button className="btn-primary" disabled={busy} type="submit">Search</button>
      </form>
      {body ? <article className="card" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{body}</article> : null}
      <div className="list" style={{ marginTop: 12 }}>
        {sources.map((source) => (
          <a key={source.url} className="card" href={source.url} target="_blank" rel="noreferrer">
            <strong>{source.title}</strong>
            {source.snippet ? <p className="muted small">{source.snippet}</p> : null}
          </a>
        ))}
      </div>
    </div>
  );
}

export function TutoringView() {
  const { savePlan, toast } = useApp();
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<ReturnType<typeof buildTutoringPlan> | null>(null);
  return (
    <div className="page">
      <h1 className="page-title">Tutoring plan</h1>
      <p className="page-sub">A session-by-session plan built around the learner’s goal. Questions, not a finished script.</p>
      <form className="inline" onSubmit={(e) => {
        e.preventDefault();
        if (!goal.trim()) return;
        const next = buildTutoringPlan(goal.trim());
        setPlan(next);
        void savePlan({ id: uid(), kind: "tutoring", title: goal.trim(), body: JSON.stringify(next), createdAt: Date.now() });
        toast("Tutoring plan saved");
      }}>
        <input className="textin" style={{ maxWidth: 480 }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal, e.g. write a clear lab report" aria-label="Learning goal" />
        <button className="btn-primary" type="submit">Build plan</button>
      </form>
      {plan ? (
        <div className="list" style={{ marginTop: 16 }}>
          {plan.map((session) => (
            <article key={session.session} className="card">
              <strong>Session {session.session} · {session.title}</strong>
              <p className="muted" style={{ margin: "6px 0" }}>{session.aim}</p>
              <ul>{session.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HomeworkView() {
  const [notes, setNotes] = useState("");
  const [guide, setGuide] = useState("");
  const [follow, setFollow] = useState("");
  const [reply, setReply] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  async function onFile(file: File) {
    setGuide("📄 Reading your file…");
    try {
      const result = await extractFile(file, (p) => setGuide(p.label));
      setNotes(result.text);
      setGuide(homeworkPrompts(result.text));
    } catch (error) { setGuide(error instanceof Error ? error.message : "This file couldn't be read."); }
  }

  async function ask() {
    const res = await fetch("/api/socratic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: `Notes:\n${notes.slice(0, 4000)}\n\nStudent says: ${follow}\nDo not give the final answer.` }] }),
    });
    const data = await res.json();
    setReply(data.content || "Tell me what the question is asking, in your own words.");
  }
  return (
    <div className="page">
      <h1 className="page-title">Homework helper</h1>
      <p className="page-sub">Upload a PDF, image, or notes file. Sage will help you work through it. It will not hand you the answer.</p>
      <input ref={fileRef} hidden type="file" accept=".pdf,.txt,.md,image/*,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
      <div className="inline">
        <button className="btn" type="button" onClick={() => fileRef.current?.click()}>Upload file</button>
      </div>
      <label className="field" style={{ marginTop: 12 }}>Or paste the question
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste the problem here" />
      </label>
      <button className="btn-primary" type="button" onClick={() => setGuide(homeworkPrompts(notes))}>Start the walkthrough</button>
      {guide ? <article className="card" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{guide}</article> : null}
      {guide ? (
        <form className="inline" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); void ask(); }}>
          <input className="textin" value={follow} onChange={(e) => setFollow(e.target.value)} placeholder="Your attempt, in a sentence" aria-label="Your attempt" />
          <button className="btn" type="submit">Ask for a question</button>
        </form>
      ) : null}
      {reply ? <article className="card" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{reply}</article> : null}
    </div>
  );
}

export function ReportView() {
  const { saveDoc, setActiveDocId, setView, toast } = useApp();
  const [text, setText] = useState(buildAppReport());
  return (
    <div className="page">
      <h1 className="page-title">App report</h1>
      <p className="page-sub">A structured product report ready to edit and share.</p>
      <textarea className="textin" style={{ minHeight: 360 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Product report" />
      <div className="inline" style={{ marginTop: 12 }}>
        <button className="btn-primary" type="button" onClick={() => {
          const doc: WritingDoc = { id: uid(), title: "Sage product report", template: "free", content: text, createdAt: Date.now(), updatedAt: Date.now(), pinned: false };
          void saveDoc(doc);
          setActiveDocId(doc.id);
          toast("Opened in the writing pad");
        }}>Edit in writing pad</button>
        <button className="btn" type="button" onClick={() => { void navigator.clipboard.writeText(text); toast("Copied"); }}>Copy</button>
        <button className="btn" type="button" onClick={() => setView("writing")}>My documents</button>
      </div>
    </div>
  );
}

export function WritingView() {
  const { docs, saveDoc, setActiveDocId, deleteDoc } = useApp();
  function openTemplate(template: WritingTemplate) {
    const meta = TEMPLATE_META[template];
    const content = meta.sections.map((section) => `${section}\n\n`).join("\n");
    const doc: WritingDoc = { id: uid(), title: meta.title, template, content, createdAt: Date.now(), updatedAt: Date.now(), pinned: false };
    void saveDoc(doc);
    setActiveDocId(doc.id);
  }
  return (
    <div className="page">
      <h1 className="page-title">Writing pad</h1>
      <p className="page-sub">Pick a structure. The editor saves itself every two seconds.</p>
      <div className="tool-grid">
        {(["lab", "field", "reflection", "argument"] as WritingTemplate[]).map((template) => (
          <button key={template} className="tool-card" type="button" onClick={() => openTemplate(template)}>
            <span className="tool-ico"><Icon name="pen" size={16} /></span>
            <h3>{TEMPLATE_META[template].title}</h3>
            <p>{TEMPLATE_META[template].sections.slice(0, 4).join(" · ")}</p>
          </button>
        ))}
      </div>
      <h2 style={{ margin: "28px 0 10px" }}>My documents</h2>
      {!docs.length ? <p className="muted">No documents yet — pick a template above to start one.</p> : (
        <div className="list">
          {docs.map((doc) => (
            <div key={doc.id} className="list-row card">
              <button className="list-row" style={{ flex: 1 }} type="button" onClick={() => setActiveDocId(doc.id)}>
                <span><strong>{doc.title}</strong><span className="muted small" style={{ display: "block" }}>{formatWhen(doc.updatedAt)} · {TEMPLATE_META[doc.template]?.title || "Notes"}</span></span>
              </button>
              <button className="btn" type="button" onClick={() => setActiveDocId(doc.id)}>Edit</button>
              <button className="mini" type="button" aria-label="Delete document" onClick={() => { if (window.confirm(`Delete “${doc.title}”?`)) void deleteDoc(doc.id); }}>🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorOverlay() {
  const { docs, activeDocId, setActiveDocId, saveDoc, toast } = useApp();
  const doc = docs.find((item) => item.id === activeDocId) ?? null;
  const [content, setContent] = useState(doc?.content || "");
  const [note, setNote] = useState("");
  const [exporting, setExporting] = useState(false);
  const [structure, setStructure] = useState<{ present: string[]; missing: string[] } | null>(null);
  const contentRef = useRef(content);
  const docRef = useRef(doc);
  contentRef.current = content;
  docRef.current = doc;
  useEffect(() => { if (doc) setContent(doc.content); }, [doc?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = docRef.current;
      if (!current || current.content === contentRef.current) return;
      const first = contentRef.current.split("\n").map((line) => line.trim()).find(Boolean);
      void saveDoc({ ...current, content: contentRef.current, title: first?.slice(0, 48) || current.title, updatedAt: Date.now() });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [saveDoc]);
  if (!doc) return null;
  const meta = TEMPLATE_META[doc.template] || TEMPLATE_META.free;
  async function exportPdf() {
    if (exporting) return;
    setExporting(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => { setTimeout(resolve, 0); }));
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      const lines = pdf.splitTextToSize(contentRef.current || " ", 180) as string[];
      let y = 16;
      for (let i = 0; i < lines.length; i++) {
        if (y > 280) { pdf.addPage(); y = 16; }
        pdf.text(lines[i], 15, y); y += 6;
        if (i % 150 === 149) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await pdf.save(`${doc?.title || "sage-notes"}.pdf`, { returnPromise: true });
      toast("PDF exported");
    } catch { toast("The PDF could not be generated. Please try again."); }
    finally { setExporting(false); }
  }

  return (
    <div className="editor-shell" role="dialog" aria-label="Writing pad editor">
      <div className="editor-toolbar">
        <button className="btn" type="button" onClick={() => setActiveDocId(null)}>Back</button>
        <strong style={{ flex: 1 }}>{doc.title}</strong>
        <button className="btn" type="button" onClick={() => setNote(meta.hints[Math.floor(Math.random() * meta.hints.length)])}>Give me a hint</button>
        <button className="btn" type="button" onClick={() => setStructure(checkStructure(doc.template, content))}>Check my structure</button>
        <button className="btn" type="button" onClick={() => setNote(ownWorkHint())}>Is this my own work</button>
        <button className="btn" type="button" onClick={() => setActiveDocId(null)}>Close</button>
      </div>
      <div className="editor-body">
        <aside className="editor-side">
          <h4>Structure</h4>
          <ul className="structure-list">
            {meta.sections.map((section) => {
              const present = content.toLowerCase().includes(section.toLowerCase());
              const checked = structure ? structure.present.includes(section) : null;
              const ok = checked === null ? present : checked;
              return (
                <li key={section} className={ok ? "sec-ok" : "sec-missing"}>
                  <span aria-hidden>{ok ? "✓" : "✕"}</span> {section}
                </li>
              );
            })}
          </ul>
          {structure ? (
            <p className={structure.missing.length ? "sec-note bad" : "sec-note good"}>
              {structure.missing.length ? `${structure.missing.length} missing: ${structure.missing.join(", ")}` : "Every listed section is present."}
            </p>
          ) : null}
          {note ? <p className="sec-note" style={{ marginTop: 12 }}>{note}</p> : null}
        </aside>
        <div className="editor-main">
          <textarea value={content} onChange={(e) => setContent(e.target.value)} aria-label="Document" />
        </div>
      </div>
      <button className="btn-primary editor-export" type="button" disabled={exporting} onClick={() => void exportPdf()}>{exporting ? <><span className="spinner" /> 📄 Generating PDF…</> : "Export PDF"}</button>
    </div>
  );
}

export function ResearchView() {
  const { researches, saveResearch, setPreset, setView } = useApp();
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState(0);
  const [current, setCurrent] = useState<Research | null>(null);
  async function run(nextTopic: string) {
    const clean = nextTopic.trim();
    if (!clean) return;
    setTopic(clean);
    setPhase(1);
    setCurrent(null);
    const started = Date.now();
    const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: clean }) });
    const data = await res.json();
    await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - started))));
    const item: Research = {
      id: uid(),
      topic: clean,
      sources: data.sources || [],
      summary: data.summary || data.error || "No verified summary found.",
      followUps: data.followUps || [],
      createdAt: Date.now(),
      pinned: false,
    };
    setCurrent(item);
    setPhase(2);
    await new Promise((r) => setTimeout(r, 700));
    setPhase(3);
    await new Promise((r) => setTimeout(r, 700));
    setPhase(4);
    await saveResearch(item);
  }
  return (
    <div className="page">
      <h1 className="page-title">Research trail</h1>
      <p className="page-sub">A visible trail: search, sources, summary, then three questions worth asking next.</p>
      <form className="inline" onSubmit={(e) => { e.preventDefault(); void run(topic); }}>
        <input className="textin" style={{ maxWidth: 420 }} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. photosynthesis" aria-label="Research topic" />
        <button className="btn-primary" type="submit">Research</button>
      </form>
      {phase > 0 ? (
        <div className="timeline" style={{ marginTop: 20 }}>
          <div className="step">{phase === 1 ? <span className="spinner" /> : null} Searching sources</div>
          {phase >= 2 ? (
            <div className="step">
              Found {current?.sources.length || 0} sources
              <div className="source-boxes">
                {current?.sources.map((source) => (
                  <a key={source.url} className="source-box" href={source.url} target="_blank" rel="noreferrer">
                    <span className="source-logo">{source.url.includes("wikipedia") ? "W" : source.url.includes(".gov") ? "GOV" : "S"}</span>
                    <span>
                      <strong>{source.title}</strong>
                      <span className="source-domain">{source.url.replace(/^https?:\/\//, "").split("/")[0]}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {phase >= 3 ? <div className="step">{phase === 3 ? <span className="spinner" /> : null} Summarizing</div> : null}
          {phase >= 4 && current ? (
            <div className="step">
              <p style={{ whiteSpace: "pre-wrap" }}>{current.summary}</p>
              <div className="source-boxes" style={{ marginTop: 10 }}>
                {current.sources.map((source) => (
                  <a key={`s-${source.url}`} className="source-box" href={source.url} target="_blank" rel="noreferrer">
                    <span className="source-logo">{source.url.includes("wikipedia") ? "W" : "↗"}</span>
                    <span><strong>{source.title}</strong><span className="source-domain">{source.url.replace(/^https?:\/\//, "").split("/")[0]}</span></span>
                  </a>
                ))}
              </div>
              <p className="grounded">Grounded in public sources. Nothing here is filled in from guesswork.</p>
              <p className="muted small" style={{ marginTop: 10 }}>Follow-up questions</p>
              <div className="inline" style={{ marginTop: 6 }}>
                {current.followUps.map((q) => <button key={q} className="btn" type="button" onClick={() => void run(q)}>{q}</button>)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <h2 style={{ margin: "28px 0 10px" }}>My researches</h2>
      <div className="list">
        {researches.map((item) => (
          <button key={item.id} className="card" type="button" onClick={() => { setCurrent(item); setPhase(4); setTopic(item.topic); }} style={{ textAlign: "left" }}>
            <strong>{item.topic}</strong>
            <span className="muted small" style={{ display: "block" }}>{formatWhen(item.createdAt)}</span>
          </button>
        ))}
      </div>
      <button className="btn" style={{ marginTop: 12 }} type="button" onClick={() => { setPreset(topic); setView("search"); }}>Open in search</button>
    </div>
  );
}

export function HarvestView() {
  const {
    docs, researches, quizzes, saveDoc, togglePinResearch, togglePinQuiz,
    deleteResearch, deleteQuiz, deleteDoc, setActiveDocId, setView, setPreset,
  } = useApp();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const all = [
    ...docs.map((doc) => ({
      key: `Writing-${doc.id}`, type: "Writing" as const, icon: "📝", title: doc.title,
      date: doc.updatedAt, pinned: doc.pinned, open: () => setActiveDocId(doc.id),
      pin: () => void saveDoc({ ...doc, pinned: !doc.pinned }), remove: () => void deleteDoc(doc.id),
    })),
    ...researches.map((item) => ({
      key: `Research-${item.id}`, type: "Research" as const, icon: "🔍", title: item.topic,
      date: item.createdAt, pinned: item.pinned,
      open: () => { setPreset(item.topic); setView("research"); },
      pin: () => void togglePinResearch(item.id), remove: () => void deleteResearch(item.id),
    })),
    ...quizzes.map((quiz) => ({
      key: `Quiz-${quiz.id}`, type: "Quiz" as const, icon: "🎯", title: quiz.title,
      date: quiz.createdAt, pinned: quiz.pinned, open: () => setView("quiz"),
      pin: () => void togglePinQuiz(quiz.id), remove: () => void deleteQuiz(quiz.id),
    })),
  ];
  const cards = all
    .filter((card) => filter === "All" || card.type === filter)
    .filter((card) => !debounced || card.title.toLowerCase().includes(debounced))
    .sort((x, y) => Number(y.pinned) - Number(x.pinned) || y.date - x.date);

  return (
    <div className="page">
      <h1 className="page-title">Harvest board</h1>
      <p className="page-sub">Everything you have saved from the Writing Pad, Research Trail, and Quiz Studio.</p>
      <div className="inline" style={{ marginBottom: 10 }}>
        <input className="textin" style={{ maxWidth: 300 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved work" aria-label="Search harvest board" />
        <select className="textin" style={{ maxWidth: 180 }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by type">
          {["All", "Writing", "Research", "Quiz"].map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <span className="muted small">{cards.length} item{cards.length === 1 ? "" : "s"}</span>
      </div>
      <div className="harvest">
        {cards.map((card) => (
          <article key={card.key} className="card">
            <span className="inline" style={{ justifyContent: "space-between" }}>
              <span className="badge-book">{card.icon} {card.type}</span>
              {card.pinned ? <span className="badge-dl">Pinned</span> : null}
            </span>
            <h3 style={{ margin: "8px 0" }}>{card.title}</h3>
            <p className="muted small">{formatWhen(card.date)}</p>
            <div className="inline" style={{ marginTop: 10 }}>
              <button className="btn" type="button" onClick={card.open}>Open</button>
              <button className="btn" type="button" onClick={card.pin}>{card.pinned ? "Unpin" : "Pin"}</button>
              <button className="mini" type="button" aria-label="Delete item" onClick={() => { if (window.confirm(`Delete “${card.title}”?`)) card.remove(); }}>🗑️</button>
            </div>
          </article>
        ))}
      </div>
      {!cards.length ? <p className="muted">{all.length ? "Nothing matches that search." : "Nothing saved yet — write a document, run a research trail, or take a quiz."}</p> : null}
    </div>
  );
}
