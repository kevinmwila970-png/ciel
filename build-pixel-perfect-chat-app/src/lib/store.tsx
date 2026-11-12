"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { idbClearAll, idbDelete, idbGetAll, idbPut, STORES } from "./idb";
import { addDaysISO, todayISO, uid } from "./study";
import { applyTheme, DEFAULT_THEME_ID, themeById } from "./themes";
import type {
  Chat,
  ChatMessage,
  ChatAttachment,
  ComposerMode,
  GutenbergBook,
  LibraryBook,
  QuizResult,
  Research,
  SectionState,
  StudyPlan,
  Task,
  View,
  VoiceItem,
  WritingDoc,
} from "./types";

type Toast = { id: string; text: string };

type Store = {
  ready: boolean;
  view: View;
  setView: (view: View) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  userId: string;
  username: string;
  setUsername: (name: string) => void;
  email: string;
  setEmail: (email: string) => void;
  avatar: string | null;
  setAvatar: (data: string | null) => void;
  themeId: string;
  setThemeId: (id: string) => void;
  colorMode: "light" | "dark" | "system";
  setColorMode: (mode: "light" | "dark" | "system") => void;
  notifications: boolean;
  setNotifications: (on: boolean) => void;
  online: boolean;
  chats: Chat[];
  activeChatId: string | null;
  newChat: () => void;
  openChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  togglePinChat: (id: string) => void;
  sendChat: (text: string, attachment?: ChatAttachment) => Promise<void>;
  busy: boolean;
  docs: WritingDoc[];
  saveDoc: (doc: WritingDoc) => Promise<void>;
  deleteDoc: (id: string) => Promise<void>;
  activeDocId: string | null;
  setActiveDocId: (id: string | null) => void;
  researches: Research[];
  saveResearch: (item: Research) => Promise<void>;
  togglePinResearch: (id: string) => Promise<void>;
  deleteResearch: (id: string) => Promise<void>;
  books: LibraryBook[];
  saveBook: (book: LibraryBook) => Promise<void>;
  tasks: Task[];
  saveTask: (task: Task) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  quizzes: QuizResult[];
  saveQuiz: (quiz: QuizResult) => Promise<void>;
  togglePinQuiz: (id: string) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;
  voiceHistory: VoiceItem[];
  saveVoice: (item: VoiceItem) => Promise<void>;
  plans: StudyPlan[];
  savePlan: (plan: StudyPlan) => Promise<void>;
  xp: number;
  streak: number;
  sections: SectionState;
  toggleSection: (key: keyof SectionState) => void;
  preset: string;
  setPreset: (value: string) => void;
  readerBook: GutenbergBook | null;
  setReaderBook: (book: GutenbergBook | null) => void;
  toasts: Toast[];
  toast: (text: string) => void;
  clearStorage: () => Promise<void>;
  exportData: () => Promise<void>;
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  draft: string;
  setDraft: (value: string) => void;
};

const Ctx = createContext<Store | null>(null);

async function mirrorChat(userId: string, chat: Chat) {
  await fetch("/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, chat }),
  }).catch(() => undefined);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [view, setViewState] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [username, setUsernameState] = useState("kevinmwila970");
  const [email, setEmailState] = useState("kevinmwila970@sage.study");
  const [avatar, setAvatarState] = useState<string | null>(null);
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [colorMode, setColorModeState] = useState<"light" | "dark" | "system">("dark");
  const [notifications, setNotificationsState] = useState(false);
  const [online, setOnline] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<WritingDoc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [researches, setResearches] = useState<Research[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
  const [voiceHistory, setVoiceHistory] = useState<VoiceItem[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sections, setSections] = useState<SectionState>({ pinned: true, recents: true, research: false });
  const [preset, setPreset] = useState("");
  const [readerBook, setReaderBook] = useState<GutenbergBook | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [composerMode, setComposerMode] = useState<ComposerMode>("auto");
  const [draft, setDraftState] = useState("");
  const chatsRef = useRef<Chat[]>([]);
  const userRef = useRef("");

  const toast = useCallback((text: string) => {
    const id = uid();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 2800);
  }, []);

  const setView = useCallback((next: View) => {
    setViewState(next);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      const id = localStorage.getItem("sage_user_id") || crypto.randomUUID();
      localStorage.setItem("sage_user_id", id);
      userRef.current = id;
      const name = localStorage.getItem("username") || "kevinmwila970";
      localStorage.setItem("username", name);
      const mail = localStorage.getItem("sage_email") || "kevinmwila970@sage.study";
      const theme = localStorage.getItem("sage_theme") || DEFAULT_THEME_ID;
      const mode = (localStorage.getItem("sage_color_mode") as "light" | "dark" | "system" | null) || "dark";
      const side = localStorage.getItem("sidebarOpen");
      const notesOn = localStorage.getItem("sage_notifications") === "1";
      const xpRaw = Number(localStorage.getItem("sage_xp") || "0");
      const streakRaw = localStorage.getItem("sage_streak");
      let storedSections = sections;
      try {
        storedSections = { ...sections, ...JSON.parse(localStorage.getItem("sage_sections") || "{}") };
      } catch {
        storedSections = sections;
      }
      if (!cancelled) {
        setUserId(id);
        setUsernameState(name);
        setEmailState(mail);
        setThemeIdState(theme);
        setColorModeState(mode);
        applyTheme(themeById(theme));
        setSidebarOpen(side !== "0");
        setNotificationsState(notesOn);
        setXp(Number.isFinite(xpRaw) ? xpRaw : 0);
        if (streakRaw) {
          try {
            setStreak(JSON.parse(streakRaw).count || 0);
          } catch {
            setStreak(0);
          }
        }
        setSections(storedSections);
        setOnline(navigator.onLine);
        setDraftState(localStorage.getItem("sage_draft") || "");
      }
      const [chatRows, docRows, researchRows, bookRows, taskRows, quizRows, voiceRows, planRows, profileRows] = await Promise.all([
        idbGetAll<Chat>(STORES.chats),
        idbGetAll<WritingDoc>(STORES.writing),
        idbGetAll<Research>(STORES.research),
        idbGetAll<LibraryBook>(STORES.books),
        idbGetAll<Task>(STORES.tasks),
        idbGetAll<QuizResult>(STORES.quizzes),
        idbGetAll<VoiceItem>(STORES.voice),
        idbGetAll<StudyPlan>(STORES.plans),
        idbGetAll<{ id: string; data?: string }>(STORES.profile),
      ]);
      // Chat history is personal: load only what the user actually created in
      // this browser. No sample or starter chats are ever inserted.
      const nextChats = chatRows;
      if (cancelled) return;
      setChats(nextChats.sort((a, b) => b.updatedAt - a.updatedAt));
      setDocs(docRows.sort((a, b) => b.updatedAt - a.updatedAt));
      setResearches(researchRows.sort((a, b) => b.createdAt - a.createdAt));
      setBooks(bookRows.sort((a, b) => b.downloadedAt - a.downloadedAt));
      setTasks(taskRows.sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      setQuizzes(quizRows.sort((a, b) => b.createdAt - a.createdAt));
      setVoiceHistory(voiceRows.sort((a, b) => b.createdAt - a.createdAt));
      setPlans(planRows.sort((a, b) => b.createdAt - a.createdAt));
      const avatarRow = profileRows.find((row) => row.id === "avatar");
      setAvatarState(avatarRow?.data ?? null);
      setReady(true);
    };
    void boot();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // boot once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarOpen", next ? "1" : "0");
      return next;
    });
  }, []);

  const setUsername = useCallback((name: string) => {
    const clean = name.trim() || "kevinmwila970";
    setUsernameState(clean);
    localStorage.setItem("username", clean);
  }, []);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    localStorage.setItem("sage_email", value);
  }, []);

  const setAvatar = useCallback(async (data: string | null) => {
    setAvatarState(data);
    if (data) await idbPut(STORES.profile, { id: "avatar", data });
    else await idbDelete(STORES.profile, "avatar");
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    const theme = themeById(id);
    applyTheme(theme);
    setColorModeState(theme.mode);
    localStorage.setItem("sage_color_mode", theme.mode);
  }, []);

  const setColorMode = useCallback((mode: "light" | "dark" | "system") => {
    setColorModeState(mode);
    localStorage.setItem("sage_color_mode", mode);
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const id = prefersDark ? "sage-night" : "paper-sage";
      setThemeIdState(id);
      applyTheme(themeById(id));
      return;
    }
    const current = themeById(localStorage.getItem("sage_theme"));
    if (current.mode !== mode) {
      const id = mode === "dark" ? "sage-night" : "paper-sage";
      setThemeIdState(id);
      applyTheme(themeById(id));
    }
  }, []);

  const setNotifications = useCallback((on: boolean) => {
    setNotificationsState(on);
    localStorage.setItem("sage_notifications", on ? "1" : "0");
    if (on && "Notification" in window) void Notification.requestPermission();
  }, []);

  const toggleSection = useCallback((key: keyof SectionState) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sage_sections", JSON.stringify(next));
      return next;
    });
  }, []);

  const saveChatLocal = useCallback(async (chat: Chat) => {
    setChats((prev) => {
      const next = [chat, ...prev.filter((item) => item.id !== chat.id)].sort((a, b) => b.updatedAt - a.updatedAt);
      chatsRef.current = next;
      return next;
    });
    await idbPut(STORES.chats, chat);
    void mirrorChat(userRef.current, chat);
  }, []);

  const newChat = useCallback(() => {
    const chat: Chat = {
      id: String(Date.now()),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      lastOpenedAt: Date.now(),
    };
    void saveChatLocal(chat);
    setActiveChatId(chat.id);
    setDraftState("");
    localStorage.setItem("sage_draft", "");
    setView("home");
    toast("New chat started");
  }, [saveChatLocal, setView, toast]);

  const openChat = useCallback((id: string) => {
    const chat = chatsRef.current.find((item) => item.id === id);
    if (!chat) return;
    const next = { ...chat, lastOpenedAt: Date.now() };
    void saveChatLocal(next);
    setActiveChatId(id);
    setDraftState("");
    localStorage.setItem("sage_draft", "");
    setView("home");
  }, [saveChatLocal, setView]);

  const renameChat = useCallback((id: string, title: string) => {
    const chat = chatsRef.current.find((item) => item.id === id);
    if (!chat) return;
    void saveChatLocal({ ...chat, title: title.trim() || chat.title, updatedAt: Date.now() });
  }, [saveChatLocal]);

  const deleteChat = useCallback(async (id: string) => {
    setChats((prev) => prev.filter((item) => item.id !== id));
    if (activeChatId === id) setActiveChatId(null);
    await idbDelete(STORES.chats, id);
    void fetch(`/api/chats?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userRef.current)}`, { method: "DELETE" });
  }, [activeChatId]);

  const togglePinChat = useCallback((id: string) => {
    const chat = chatsRef.current.find((item) => item.id === id);
    if (!chat) return;
    void saveChatLocal({ ...chat, pinned: !chat.pinned, updatedAt: Date.now() });
  }, [saveChatLocal]);

  const sendChat = useCallback(async (text: string, attachment?: ChatAttachment) => {
    const typed = text.trim() || (attachment?.kind === "image" ? "What do you think of this image?" : attachment ? "Help me understand these notes." : "");
    if (!typed) return;
    const existing = activeChatId ? chatsRef.current.find((item) => item.id === activeChatId) : undefined;
    const id = existing?.id || String(Date.now());
    const prior = existing?.messages.filter((m) => !m.pending) ?? [];
    const tutor = existing?.tutor;
    const userMsg: ChatMessage = { role: "user", content: typed, timestamp: Date.now(), ...(attachment ? { attachments: [attachment] } : {}) };
    const pendingMsg: ChatMessage = { role: "assistant", content: "Sage is typing…", timestamp: Date.now(), pending: true };
    const title = prior.some((m) => m.role === "user") ? existing!.title : typed.replace(/\s+/g, " ").slice(0, 30);
    const draftChat: Chat = {
      id, title, messages: [...prior, userMsg, pendingMsg],
      createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now(),
      pinned: existing?.pinned ?? false, lastOpenedAt: Date.now(), tutor,
    };
    setBusy(true);
    setActiveChatId(id);
    setView("home");
    try {
      await saveChatLocal(draftChat).catch(() => toast("Your device couldn't save the attachment offline. The message can still be sent."));
      const requestMessages = [...prior, userMsg].slice(-16);
      const imageIndices = requestMessages.map((m, index) => m.attachments?.some((a) => a.kind === "image") ? index : -1).filter((i) => i >= 0).slice(-3);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages.map((m, index) => ({
            role: m.role, content: m.content,
            attachments: m.attachments?.filter((a) => a.kind !== "image" || imageIndices.includes(index)).map((a) => ({ ...a, text: a.text?.slice(0, 24000) })),
          })), tutor, title,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data = (await res.json().catch(() => null)) as { content?: string; error?: string; tutor?: Chat["tutor"] } | null;
      const reply = data?.content || data?.error || "Sage couldn't complete that request. Please try again.";
      const latest = chatsRef.current.find((c) => c.id === id);
      await saveChatLocal({
        ...draftChat, title: latest?.title || title, pinned: latest?.pinned ?? draftChat.pinned,
        messages: [...prior, userMsg, { role: "assistant", content: reply, timestamp: Date.now() }],
        updatedAt: Date.now(), tutor: data?.tutor ?? tutor,
      }).catch(() => toast("Reply received, but your device couldn't save it offline."));
    } catch {
      await saveChatLocal({
        ...draftChat,
        messages: [...prior, userMsg, { role: "assistant", content: "The request was interrupted. Your attachment is still here; try sending your question again.", timestamp: Date.now() }],
        updatedAt: Date.now(),
      }).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }, [activeChatId, saveChatLocal, setView, toast]);

  const saveDoc = useCallback(async (doc: WritingDoc) => {
    setDocs((prev) => [doc, ...prev.filter((item) => item.id !== doc.id)].sort((a, b) => b.updatedAt - a.updatedAt));
    await idbPut(STORES.writing, doc);
  }, []);
  const deleteDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((item) => item.id !== id));
    await idbDelete(STORES.writing, id);
  }, []);
  const saveResearch = useCallback(async (item: Research) => {
    setResearches((prev) => [item, ...prev.filter((row) => row.id !== item.id)].sort((a, b) => b.createdAt - a.createdAt));
    await idbPut(STORES.research, item);
  }, []);
  const togglePinResearch = useCallback(async (id: string) => {
    const item = researches.find((row) => row.id === id);
    if (!item) return;
    await saveResearch({ ...item, pinned: !item.pinned });
  }, [researches, saveResearch]);
  const deleteResearch = useCallback(async (id: string) => {
    setResearches((prev) => prev.filter((row) => row.id !== id));
    await idbDelete(STORES.research, id);
  }, []);
  const saveBook = useCallback(async (book: LibraryBook) => {
    setBooks((prev) => [book, ...prev.filter((item) => item.id !== book.id)]);
    await idbPut(STORES.books, book);
  }, []);
  const saveTask = useCallback(async (task: Task) => {
    setTasks((prev) => [task, ...prev.filter((item) => item.id !== task.id)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    await idbPut(STORES.tasks, task);
  }, []);
  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const done = !task.done;
    await saveTask({ ...task, done });
    if (done) {
      setXp((prev) => {
        const next = prev + 10;
        localStorage.setItem("sage_xp", String(next));
        return next;
      });
      const today = todayISO();
      const raw = localStorage.getItem("sage_streak");
      let count = 1;
      let last = "";
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { count: number; last: string };
          count = parsed.count;
          last = parsed.last;
        } catch {
          count = 1;
        }
      }
      if (last !== today) count = last === addDaysISO(-1) ? count + 1 : 1;
      localStorage.setItem("sage_streak", JSON.stringify({ count, last: today }));
      setStreak(count);
      toast("+10 XP");
    }
  }, [saveTask, tasks, toast]);
  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
    await idbDelete(STORES.tasks, id);
  }, []);
  const saveQuiz = useCallback(async (quiz: QuizResult) => {
    setQuizzes((prev) => [quiz, ...prev.filter((item) => item.id !== quiz.id)]);
    await idbPut(STORES.quizzes, quiz);
  }, []);
  const togglePinQuiz = useCallback(async (id: string) => {
    const quiz = quizzes.find((item) => item.id === id);
    if (!quiz) return;
    await saveQuiz({ ...quiz, pinned: !quiz.pinned });
  }, [quizzes, saveQuiz]);
  const deleteQuiz = useCallback(async (id: string) => {
    setQuizzes((prev) => prev.filter((row) => row.id !== id));
    await idbDelete(STORES.quizzes, id);
  }, []);
  const saveVoice = useCallback(async (item: VoiceItem) => {
    setVoiceHistory((prev) => [item, ...prev.filter((row) => row.id !== item.id)]);
    await idbPut(STORES.voice, item);
  }, []);
  const savePlan = useCallback(async (plan: StudyPlan) => {
    setPlans((prev) => [plan, ...prev.filter((item) => item.id !== plan.id)]);
    await idbPut(STORES.plans, plan);
  }, []);

  const clearStorage = useCallback(async () => {
    await idbClearAll();
    const keepUser = userRef.current;
    localStorage.clear();
    localStorage.setItem("sage_user_id", keepUser);
    localStorage.setItem("username", "kevinmwila970");
    window.location.reload();
  }, []);

  const exportData = useCallback(async () => {
    const payload = { chats, docs, researches, books, tasks, quizzes, voiceHistory, plans, username, email, xp, streak };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sage-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [books, chats, docs, email, plans, quizzes, researches, streak, tasks, username, voiceHistory, xp]);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
    localStorage.setItem("sage_draft", value);
  }, []);

  const value = useMemo<Store>(() => ({
    ready, view, setView, sidebarOpen, toggleSidebar, mobileOpen, setMobileOpen,
    userId, username, setUsername, email, setEmail, avatar, setAvatar, themeId, setThemeId,
    colorMode, setColorMode, notifications, setNotifications, online, chats, activeChatId,
    newChat, openChat, renameChat, deleteChat, togglePinChat, sendChat, busy,
    docs, saveDoc, deleteDoc,
    activeDocId, setActiveDocId, researches, saveResearch, togglePinResearch, deleteResearch, books, saveBook,
    tasks, saveTask, toggleTask, deleteTask, quizzes, saveQuiz, togglePinQuiz, deleteQuiz, voiceHistory,
    saveVoice, plans, savePlan, xp, streak, sections, toggleSection, preset, setPreset,
    readerBook, setReaderBook, toasts, toast, clearStorage, exportData, composerMode, setComposerMode,
    draft, setDraft,
  }), [
    ready, view, setView, sidebarOpen, toggleSidebar, mobileOpen, userId, username, setUsername,
    email, setEmail, avatar, setAvatar, themeId, setThemeId, colorMode, setColorMode, notifications,
    setNotifications, online, chats, activeChatId, newChat, openChat, renameChat, deleteChat,
    togglePinChat, sendChat, busy,
    docs, saveDoc, deleteDoc, activeDocId, researches, saveResearch, togglePinResearch, deleteResearch, books,
    saveBook, tasks, saveTask, toggleTask, deleteTask, quizzes, saveQuiz, togglePinQuiz, deleteQuiz,
    voiceHistory, saveVoice, plans, savePlan, xp, streak, sections, toggleSection, preset,
    readerBook, toasts, toast, clearStorage, exportData, composerMode, draft,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
