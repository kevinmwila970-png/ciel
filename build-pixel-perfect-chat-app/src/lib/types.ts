export type Role = "user" | "assistant";

export type Source = { title: string; url: string; snippet?: string };

export type ChatAttachment = {
  id: string;
  kind: "image" | "pdf" | "text";
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  text?: string;
  pageCount?: number;
};

export type FileProgress = {
  label: string;
  percent?: number;
  detail?: string;
};

export type ChatMessage = {
  role: Role;
  content: string;
  timestamp: number;
  sources?: Source[];
  pending?: boolean;
  attachments?: ChatAttachment[];
};

export type TutorSession = {
  topic: string;
  phase: "idle" | "awaiting" | "quiz" | "done";
  asked: number;
  startedAt: number;
};

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  lastOpenedAt: number;
  tutor?: TutorSession;
};

export type WritingTemplate = "lab" | "field" | "reflection" | "argument" | "free";

export type WritingDoc = {
  id: string;
  title: string;
  template: WritingTemplate;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
};

export type Research = {
  id: string;
  topic: string;
  sources: Source[];
  summary: string;
  followUps: string[];
  createdAt: number;
  pinned: boolean;
};

export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  cover: string | null;
  text: string;
  downloadedAt: number;
};

export type GutenbergBook = {
  id: number;
  title: string;
  author: string;
  cover: string | null;
  textUrl: string | null;
  subjects: string[];
};

export type Task = {
  id: string;
  name: string;
  dueDate: string;
  bookId: string | null;
  priority: "high" | "med" | "low";
  done: boolean;
  createdAt: number;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type QuizResult = {
  id: string;
  title: string;
  questions: QuizQuestion[];
  score: number;
  total: number;
  createdAt: number;
  pinned: boolean;
  mode: "quiz" | "practice" | "flashcards";
};

export type VoiceItem = {
  id: string;
  transcript: string;
  response: string;
  createdAt: number;
};

export type StudyPlan = {
  id: string;
  kind: "timetable" | "tutoring";
  title: string;
  body: string;
  createdAt: number;
};

export type ComposerMode = "auto" | "explain" | "timetable" | "search";

export type View =
  | "home"
  | "history"
  | "library"
  | "writing"
  | "research"
  | "harvest"
  | "quiz"
  | "voice"
  | "planner"
  | "socratic"
  | "profile"
  | "settings"
  | "guide"
  | "explain"
  | "tutoring"
  | "homework"
  | "report"
  | "search";

export type SectionState = {
  pinned: boolean;
  recents: boolean;
  research: boolean;
};
