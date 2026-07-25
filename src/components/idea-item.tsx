"use client";

import { useTransition } from "react";
import { deleteIdea, promoteIdea } from "@/app/actions/ideas";

export function IdeaItem({
  id,
  content,
  createdAt,
  projects,
}: {
  id: string;
  content: string;
  createdAt: string;
  projects?: { id: string; title: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm">{content}</p>
        <p className="mt-1 text-xs text-neutral-400">{createdAt}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {projects && projects.length > 0 && (
          <select
            defaultValue=""
            disabled={isPending}
            onChange={(e) => {
              const projectId = e.target.value;
              if (!projectId) return;
              startTransition(async () => {
                await promoteIdea(id, projectId);
              });
            }}
            className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs outline-none dark:border-neutral-700"
          >
            <option value="" disabled>
              Move to project…
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
        <button
          disabled={isPending}
          onClick={() => startTransition(async () => { await deleteIdea(id); })}
          className="text-xs text-neutral-400 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
