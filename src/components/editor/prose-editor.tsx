"use client";

import type { ProseContent } from "@/lib/draft-content";

export function ProseEditor({
  content,
  onChange,
}: {
  content: ProseContent;
  onChange: (content: ProseContent) => void;
}) {
  return (
    <textarea
      value={content.text}
      onChange={(e) => onChange({ type: "prose", text: e.target.value })}
      placeholder="Start writing…"
      className="min-h-[70vh] w-full flex-1 resize-none bg-transparent font-serif text-lg leading-relaxed outline-none"
      autoFocus
    />
  );
}
