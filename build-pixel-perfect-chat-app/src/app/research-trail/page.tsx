import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sage Research Trail - sources, summary, follow-ups",
  description: "Follow a visible research trail: sources with links, a summary, and follow-up questions in Sage.",
  alternates: { canonical: "https://3000-igni2f302eqwgv60z00gv.e2b.app/research-trail" },
  openGraph: {
    title: "Sage Research Trail - sources, summary, follow-ups",
    description: "Follow a visible research trail: sources with links, a summary, and follow-up questions in Sage.",
    url: "https://3000-igni2f302eqwgv60z00gv.e2b.app/research-trail",
    images: ["/icon-512.png"],
  },
};

export default function Page() {
  return <AppShell initialView="research" />;
}
