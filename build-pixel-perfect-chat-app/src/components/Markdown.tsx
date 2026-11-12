"use client";

import { Fragment, type ReactNode } from "react";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="md-code">{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block = { kind: "p" | "h" | "ul" | "ol" | "hr"; lines: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let current: Block | null = null;
  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^(\d{1,2})[.)]\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "h", lines: [heading[2]] });
      continue;
    }
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flush();
      blocks.push({ kind: "hr", lines: [] });
      continue;
    }
    if (bullet) {
      if (!current || current.kind !== "ul") {
        flush();
        current = { kind: "ul", lines: [] };
      }
      current.lines.push(bullet[1]);
      continue;
    }
    if (numbered) {
      if (!current || current.kind !== "ol") {
        flush();
        current = { kind: "ol", lines: [] };
      }
      current.lines.push(`${numbered[1]}. ${numbered[2]}`);
      continue;
    }
    if (!current || current.kind !== "p") {
      flush();
      current = { kind: "p", lines: [] };
    }
    current.lines.push(line.trim());
  }
  flush();
  return blocks;
}

export function Markdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <div className="md">
      {blocks.map((block, bi) => {
        if (block.kind === "hr") return <hr key={bi} className="md-hr" />;
        if (block.kind === "h") return <p key={bi} className="md-h">{inline(block.lines[0], `h${bi}`)}</p>;
        if (block.kind === "ul") {
          return (
            <ul key={bi} className="md-ul">
              {block.lines.map((line, li) => (
                <li key={li}>{inline(line, `u${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={bi} className="md-ol">
              {block.lines.map((line, li) => (
                <li key={li}>{inline(line.replace(/^\d+\.\s*/, ""), `o${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={bi} className="md-p">
            {block.lines.map((line, li) => (
              <Fragment key={li}>
                {li > 0 ? " " : null}
                {inline(line, `p${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
