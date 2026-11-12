import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sage Quiz Studio - 10 conceptual questions from your notes",
  description: "Generate ten real conceptual multiple-choice questions from notes, books, or topics. Quiz Studio by Sage.",
  alternates: { canonical: "https://3000-igni2f302eqwgv60z00gv.e2b.app/quiz-studio" },
  openGraph: {
    title: "Sage Quiz Studio - 10 conceptual questions from your notes",
    description: "Generate ten real conceptual multiple-choice questions from notes, books, or topics. Quiz Studio by Sage.",
    url: "https://3000-igni2f302eqwgv60z00gv.e2b.app/quiz-studio",
    images: ["/icon-512.png"],
  },
};

export default function Page() {
  return <AppShell initialView="quiz" />;
}
