"use client";

import { useId, useMemo } from "react";
import { quillInner } from "@/lib/quillSvg";

export function Quill({ size = 36, detail = "small", drop = true, className }: { size?: number; detail?: "full" | "small"; drop?: boolean; className?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const html = useMemo(() => quillInner({ id: `q${raw}`, detail, drop }), [raw, detail, drop]);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="11 17 180 182"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return <Quill className="logo" size={size} />;
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "compose":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
    case "panel":
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>;
    case "history":
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></svg>;
    case "chat":
      return <svg {...common}><path d="M6 18 3 21V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6Z" /></svg>;
    case "building":
      return <svg {...common}><path d="M4 20V6l8-3 8 3v14" /><path d="M9 20v-5h6v5" /><path d="M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01" /></svg>;
    case "people":
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 4.13a3 3 0 0 1 0 5.74" /></svg>;
    case "pen":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
    case "compass":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 6-6 2 2-6Z" /></svg>;
    case "cap":
      return <svg {...common}><path d="m2 9 10-5 10 5-10 5Z" /><path d="M6 11.5V16c2 1.5 10 1.5 12 0v-4.5" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>;
    case "download":
      return <svg {...common}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" /></svg>;
    case "gear":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
    case "mic":
      return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>;
    case "calendar":
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
    case "globe":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" /></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "moon":
      return <svg {...common}><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" /></svg>;
    case "palette":
      return (
        <svg {...common}>
          <path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3-3.4 3H16a2 2 0 0 0-1.4 3.4c.4.5.4 1.2 0 1.7-.6.6-1.5.9-2.6.9Z" />
          <circle cx="7.5" cy="11" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="7.2" r="1.15" fill="currentColor" stroke="none" />
          <circle cx="15" cy="7.2" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "close":
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12" /></svg>;
    case "clip":
      return <svg {...common}><path d="M8 7h8v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Z" /><path d="M8 7V5a2 2 0 0 1 2-2h4" /></svg>;
    case "upload":
      return <svg {...common}><path d="M12 16V4" /><path d="m7 8 5-5 5 5" /><path d="M4 20h16" /></svg>;
    case "target":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></svg>;
    case "leaf":
      return <svg {...common}><path d="M5 19c8 0 12-8 14-14-6 2-14 6-14 14Z" /><path d="M8 15c2-2 5-4 8-5" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 5 5L20 7" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
