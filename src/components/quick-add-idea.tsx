"use client";

import { useRef, useState, useTransition } from "react";
import { createIdea } from "@/app/actions/ideas";

export function QuickAddIdea({ projectId }: { projectId?: string }) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content) return;
    startTransition(async () => {
      await createIdea(content, projectId ?? null);
      setValue("");
      inputRef.current?.focus();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder="Quick-add an idea…"
        rows={1}
        className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        Add
      </button>
    </form>
  );
}
