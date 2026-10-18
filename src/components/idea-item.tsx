"use client";

import { useTransition } from "react";
import { deleteIdea, promoteIdea } from "@/app/actions/ideas";
import { useToast } from "@/components/toast";

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
  const toast = useToast();

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm">{content}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{createdAt}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        {projects && projects.length > 0 && (
          <select
            defaultValue=""
            disabled={isPending}
            onChange={(e) => {
              const projectId = e.target.value;
              if (!projectId) return;
              startTransition(async () => {
                try {
                  await promoteIdea(id, projectId);
                  toast.success("Moved to project");
                } catch {
                  toast.error("Couldn't move that idea — try again");
                }
              });
            }}
            className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs outline-none sm:flex-none dark:border-neutral-700"
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
          onClick={() => {
            if (!window.confirm("Delete this idea?")) return;
            startTransition(async () => {
              try {
                await deleteIdea(id);
                toast.success("Idea deleted");
              } catch {
                toast.error("Couldn't delete — try again");
              }
            });
          }}
          className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-600 disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
