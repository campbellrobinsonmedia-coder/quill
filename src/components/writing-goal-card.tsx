import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { localDateString, previousDay } from "@/lib/writing-day";

export async function WritingGoalCard({ userId }: { userId: string }) {
  const today = await localDateString();
  const [user, days] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { dailyWordGoal: true },
    }),
    prisma.writingDay.findMany({
      where: { userId, words: { gt: 0 } },
      orderBy: { date: "desc" },
      take: 60,
      select: { date: true, words: true },
    }),
  ]);

  const goal = user.dailyWordGoal;
  const wordsToday = days.find((d) => d.date === today)?.words ?? 0;

  // Consecutive days written, ending today — or yesterday, so the streak
  // isn't shown as broken before the writer has had a chance to write today.
  const written = new Set(days.map((d) => d.date));
  let cursor = written.has(today) ? today : previousDay(today);
  let streak = 0;
  while (written.has(cursor)) {
    streak++;
    cursor = previousDay(cursor);
  }

  const met = goal !== null && wordsToday >= goal;
  const pct = goal ? Math.min(100, Math.round((wordsToday / goal) * 100)) : 0;

  return (
    <section
      aria-label="Writing today"
      className="space-y-2 rounded-md border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium">
          {met
            ? "Goal met — nice work today"
            : wordsToday > 0
              ? "You've written today"
              : "Nothing written yet today"}
        </p>
        <p className="text-xs text-neutral-500">
          {wordsToday.toLocaleString()}
          {goal ? ` / ${goal.toLocaleString()}` : ""} words
          {streak > 0 && ` · ${streak}-day streak`}
        </p>
      </div>
      {goal ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-valuenow={Math.min(wordsToday, goal)}
          aria-label="Daily word goal progress"
          className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
        >
          <div
            className={`h-full rounded-full ${met ? "bg-green-600" : "bg-neutral-900 dark:bg-white"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          <Link href="/settings" className="underline underline-offset-2">
            Set a daily word goal
          </Link>{" "}
          to track progress here.
        </p>
      )}
    </section>
  );
}
