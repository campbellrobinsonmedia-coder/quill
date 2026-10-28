"use client";

import { StatusBar, STATUS_COLORS } from "@/components/plan/status-bar";
import { STATUS_LABELS, type PlanProgress } from "@/lib/plan-progress";

// Where the script stands against the plan: scenes written, pages against the
// goal, and how the work is spread across the story's beats.
export function ProgressPanel({ progress }: { progress: PlanProgress }) {
  const { total, counts, scriptPages, target, percentOfTarget, beats } = progress;
  if (total === 0 && !scriptPages) return null;

  const showBeats = beats.length > 1;
  const over = target !== null && scriptPages !== null && scriptPages > target;

  return (
    <section
      aria-label="Progress"
      className="space-y-3 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {total > 0 && (
          <div className="space-y-1.5">
            <p>
              <span className="font-medium tabular-nums">{counts.written}</span>
              <span className="text-neutral-500"> of {total} scenes written</span>
              {counts.started > 0 && (
                <span className="text-neutral-500"> · {counts.started} started</span>
              )}
            </p>
            <StatusBar counts={counts} total={total} />
          </div>
        )}
        {scriptPages !== null && (
          <div className="space-y-1.5">
            <p>
              <span className="font-medium tabular-nums">{scriptPages}</span>
              <span className="text-neutral-500">
                {target ? ` of ${target} pages` : " pages"}
                {percentOfTarget !== null && ` · ${percentOfTarget}%`}
                {over && ` · ${Math.round(scriptPages - target)} over`}
              </span>
            </p>
            {target ? (
              <div
                role="progressbar"
                aria-label="Pages written"
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={Math.min(scriptPages, target)}
                className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
              >
                <div
                  className={over ? "h-full bg-amber-500" : "h-full bg-emerald-500 dark:bg-emerald-400"}
                  style={{ width: `${Math.min(100, (scriptPages / target) * 100)}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Set a page target in the project settings.</p>
            )}
          </div>
        )}
      </div>

      {showBeats && (
        <div className="overflow-x-auto">
          <div className="flex min-w-[28rem] gap-1" role="list" aria-label="Progress by beat">
            {beats.map((b) => (
              <div
                key={b.key}
                role="listitem"
                style={{ flexGrow: b.total, flexBasis: 0, minWidth: "3.5rem" }}
                title={`${b.label}: ${b.counts.written} written, ${b.counts.started} started, ${b.counts.idea} idea${
                  b.pages ? ` · ${b.pages} pages` : ""
                }`}
                className="space-y-1"
              >
                <StatusBar counts={b.counts} total={b.total} />
                <p className="truncate text-[11px] text-neutral-500">{b.label}</p>
                <p className="text-[10px] tabular-nums text-neutral-400">
                  {b.total} scene{b.total === 1 ? "" : "s"}
                  {b.pages > 0 && ` · ${b.pages} pp`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
        {(["written", "started", "idea"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s]}`} />
            {STATUS_LABELS[s]}
          </span>
        ))}
      </p>
    </section>
  );
}
