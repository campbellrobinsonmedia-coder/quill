"use client";

import { useTransition } from "react";
import { setBeatGap } from "@/app/actions/beats";
import { useToast } from "@/components/toast";
import type { openGaps } from "@/lib/set-aside";

type Gap = ReturnType<typeof openGaps>[number];

// Everything still to be filled in on the board: placeholder scenes and beats.
export function GapsPanel({
  gaps,
  beatTitleOf,
  onOpenCard,
}: {
  gaps: Gap[];
  beatTitleOf: (beatId: string) => string | undefined;
  onOpenCard: (id: string) => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  if (gaps.length === 0) return null;

  function markFilled(id: string) {
    startTransition(async () => {
      try {
        await setBeatGap(id, false);
      } catch {
        toast.error("Couldn't update the beat — try again");
      }
    });
  }

  return (
    <details
      open
      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <summary className="cursor-pointer font-medium">
        {gaps.length} gap{gaps.length === 1 ? "" : "s"} still to fill
      </summary>
      <ul className="mt-2 space-y-1.5">
        {gaps.map((g) => (
          <li key={`${g.kind}-${g.id}`} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="text-xs uppercase tracking-wide opacity-70">
                {g.kind === "beat" ? "Beat" : g.beatId ? (beatTitleOf(g.beatId) ?? "Scene") : "Unplanned scene"}
              </span>{" "}
              {g.kind === "scene" ? (
                <button type="button" onClick={() => onOpenCard(g.id)} className="text-left underline underline-offset-2">
                  {g.title}
                </button>
              ) : (
                <span>{g.title}</span>
              )}
            </span>
            {g.kind === "beat" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => markFilled(g.id)}
                className="shrink-0 text-xs underline underline-offset-2 disabled:opacity-60"
              >
                Mark filled
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
