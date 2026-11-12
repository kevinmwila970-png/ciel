"use client";

import { useEffect, useState } from "react";
import type { ChatAttachment, FileProgress } from "@/lib/types";

export function LoadingStatus({ label, percent, detail }: FileProgress) {
  const value = percent === undefined ? undefined : Math.round(Math.min(100, Math.max(0, percent)));
  return (
    <div className="operation-status" role="status" aria-live="polite" aria-atomic="true">
      <div className="operation-label">{value === 100 ? <span aria-hidden="true">✓</span> : <span className="spinner" aria-hidden="true" />}<span>{label}</span>{value !== undefined ? <span className="operation-percent">{value}%</span> : null}</div>
      <div className={`operation-progress ${value === undefined ? "indeterminate" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={value === undefined ? undefined : { width: `${value}%` }} />
      </div>
      {detail ? <p className="operation-detail">{detail}</p> : null}
    </div>
  );
}

export function ChatPending({ image, timestamp }: { image?: ChatAttachment; timestamp: number }) {
  const [reading, setReading] = useState(() => Date.now() - timestamp < 900);
  useEffect(() => {
    const timer = window.setTimeout(() => setReading(false), Math.max(0, 900 - (Date.now() - timestamp)));
    return () => window.clearTimeout(timer);
  }, [timestamp]);
  return (
    <div className="chat-pending" role="status" aria-live="polite">
      {image?.dataUrl ? <img className="pending-image" src={image.dataUrl} alt="Image being analyzed" /> : null}
      <div>
        {image ? <div className="operation-label"><span className="spinner" aria-hidden="true" />{reading ? "👁️ Reading your image…" : "🤔 Analyzing image…"}</div> : null}
        <div className="typing-status">Sage is typing<span className="typing-dots" aria-hidden="true"><i /><i /><i /></span></div>
        {image ? <p className="operation-detail">Looking at the details before replying.</p> : null}
      </div>
    </div>
  );
}
