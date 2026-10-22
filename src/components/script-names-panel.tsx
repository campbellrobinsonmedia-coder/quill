"use client";

import { useTransition } from "react";
import { useToast } from "@/components/toast";
import { addCastFromScript, addLocationsFromScript } from "@/app/actions/cast";
import { titleCaseName } from "@/lib/cast";

export type ScriptName = { name: string; detail: string };

// "In the script, not in your cast/world yet" — a one-click way to turn what
// the writer has already typed into saved characters and locations.
export function ScriptNamesPanel({
  projectId,
  kind,
  rows,
  canUseSeries,
}: {
  projectId: string;
  kind: "character" | "location";
  rows: ScriptName[];
  canUseSeries: boolean;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const noun = kind === "character" ? "cast" : "world";
  const add = kind === "character" ? addCastFromScript : addLocationsFromScript;

  if (rows.length === 0) return null;

  function run(names: string[], target: "project" | "series") {
    startTransition(async () => {
      try {
        const result = await add(projectId, names, target);
        toast.success(
          result.created > 0
            ? `Added ${result.created} to ${target === "series" ? "the series bible" : `your ${noun}`}`
            : "Already saved"
        );
      } catch {
        toast.error("Couldn't add that — try again");
      }
    });
  }

  const button =
    "inline-flex h-8 items-center rounded-md border border-neutral-300 px-2.5 text-xs hover:bg-white disabled:opacity-60 dark:border-neutral-600 dark:hover:bg-neutral-800";

  return (
    <section
      aria-label={`In the script but not in your ${noun}`}
      className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-blue-900 dark:text-blue-100">
          In the script, not in your {noun} yet ({rows.length})
        </h2>
        <button
          type="button"
          disabled={isPending}
          className={button}
          onClick={() => run(rows.map((r) => r.name), "project")}
        >
          Add all
        </button>
      </div>
      <ul className="divide-y divide-blue-100 dark:divide-blue-900">
        {rows.map((row) => (
          <li key={row.name} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{titleCaseName(row.name)}</p>
              <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{row.detail}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={isPending}
                className={button}
                onClick={() => run([row.name], "project")}
              >
                {canUseSeries ? "Add to episode" : `Add to ${noun}`}
              </button>
              {canUseSeries && (
                <button
                  type="button"
                  disabled={isPending}
                  className={button}
                  onClick={() => run([row.name], "series")}
                >
                  Add to series bible
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
