import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sage Library - read full books free",
  description: "Search and read full Project Gutenberg books cover to cover in Sage, with offline downloads. A room for curious minds.",
  alternates: { canonical: "https://3000-igni2f302eqwgv60z00gv.e2b.app/library" },
  openGraph: {
    title: "Sage Library - read full books free",
    description: "Search and read full Project Gutenberg books cover to cover in Sage, with offline downloads. A room for curious minds.",
    url: "https://3000-igni2f302eqwgv60z00gv.e2b.app/library",
    images: ["/icon-512.png"],
  },
};

export default function Page() {
  return <AppShell initialView="library" />;
}
