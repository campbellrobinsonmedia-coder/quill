"use client";

import { useState, useTransition } from "react";
import { createSeriesIdea } from "@/app/actions/ideas";

export function NewSeasonIdeaForm({
  seriesId,
  seasonId,
}: {
  seriesId: string;
  seasonId: string;
}) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createSeriesIdea(seriesId, trimmed, { seasonId });
      setContent("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Quick-add an idea for this season…"
        rows={1}
        className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        Add
      </button>
    </form>
  );
}
