import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sage Writing Pad - Lab Report, Field Report, Reflection & Essay",
  description: "Structured writing with hints, structure checks, and PDF export. Sage Writing Pad — where knowledge grows.",
  alternates: { canonical: "https://3000-igni2f302eqwgv60z00gv.e2b.app/writing-pad" },
  openGraph: {
    title: "Sage Writing Pad - Lab Report, Field Report, Reflection & Essay",
    description: "Structured writing with hints, structure checks, and PDF export. Sage Writing Pad — where knowledge grows.",
    url: "https://3000-igni2f302eqwgv60z00gv.e2b.app/writing-pad",
    images: ["/icon-512.png"],
  },
};

export default function Page() {
  return <AppShell initialView="writing" />;
}
