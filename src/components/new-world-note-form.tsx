"use client";

import { useState, useTransition } from "react";
import { createWorldNote } from "@/app/actions/world-notes";

export function NewWorldNoteForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    startTransition(async () => {
      await createWorldNote(projectId, trimmed);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New location, object, lore entry…"
        className="flex-1 max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        Add entry
      </button>
    </form>
  );
}
