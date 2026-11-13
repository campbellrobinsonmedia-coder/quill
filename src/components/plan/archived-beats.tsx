"use client";

import { useTransition } from "react";
import { deleteBeat, setBeatArchived } from "@/app/actions/beats";
import { useToast } from "@/components/toast";

export type ArchivedBeat = { id: string; title: string; sceneCount: number };

// Beats put away from the board. Their scenes wait with them, out of the
// counts and printouts, until the beat is restored (or deleted).
export function ArchivedBeats({ beats }: { beats: ArchivedBeat[] }) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  if (beats.length === 0) return null;

  function restore(beat: ArchivedBeat) {
    startTransition(async () => {
      try {
        await setBeatArchived(beat.id, false);
        toast.success(`${beat.title} is back on the board`);
      } catch {
        toast.error("Couldn't restore the beat — try again");
      }
    });
  }

  function remove(beat: ArchivedBeat) {
    const scenes = beat.sceneCount
      ? ` Its ${beat.sceneCount} scene${beat.sceneCount === 1 ? "" : "s"} move to Unplanned.`
      : "";
    if (!window.confirm(`Delete the beat "${beat.title}" for good?${scenes}`)) return;
    startTransition(async () => {
      try {
        await deleteBeat(beat.id);
        toast.success("Beat deleted");
      } catch {
        toast.error("Couldn't delete — try again");
      }
    });
  }

  return (
    <details className="rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
        Archived beats ({beats.length})
      </summary>
      <p className="mt-2 text-xs text-neutral-500">
        Put away with their scenes, which aren&apos;t counted or printed. Restore one to bring it
        back at the end of the board.
      </p>
      <ul className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800">
        {beats.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="font-medium">{b.title}</span>
              <span className="text-neutral-500">
                {" "}
                · {b.sceneCount} scene{b.sceneCount === 1 ? "" : "s"}
              </span>
            </span>
            <span className="flex shrink-0 gap-3 text-xs">
              <button
                type="button"
                disabled={isPending}
                onClick={() => restore(b)}
                className="underline underline-offset-2 disabled:opacity-60"
              >
                Restore
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => remove(b)}
                className="text-neutral-500 hover:text-red-600 disabled:opacity-60"
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
