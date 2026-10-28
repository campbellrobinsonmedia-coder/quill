import type { CardStatus } from "@/lib/plan-progress";

export const STATUS_COLORS: Record<CardStatus, string> = {
  written: "bg-emerald-500 dark:bg-emerald-400",
  started: "bg-amber-400 dark:bg-amber-500",
  idea: "bg-neutral-200 dark:bg-neutral-700",
};

// A stacked bar of how many scenes are written, started and still ideas.
export function StatusBar({
  counts,
  total,
  className = "h-2",
}: {
  counts: Record<CardStatus, number>;
  total: number;
  className?: string;
}) {
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${className}`}>
      {total > 0 &&
        (["written", "started", "idea"] as const).map((s) =>
          counts[s] > 0 ? (
            <div key={s} className={STATUS_COLORS[s]} style={{ width: `${(counts[s] / total) * 100}%` }} />
          ) : null
        )}
    </div>
  );
}
