"use client";

import { useState, useTransition } from "react";
import { setDailyWordGoal } from "@/app/actions/settings";
import { useToast } from "@/components/toast";

export function GoalForm({ initialGoal }: { initialGoal: number | null }) {
  const toast = useToast();
  const [value, setValue] = useState(initialGoal ? String(initialGoal) : "");
  const [isPending, startTransition] = useTransition();

  function save(goal: number | null) {
    startTransition(async () => {
      try {
        await setDailyWordGoal(goal);
        toast.success(goal ? "Daily goal saved" : "Daily goal cleared");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save goal");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(value);
        if (!value.trim()) return save(null);
        if (!Number.isInteger(n)) return toast.error("Enter a whole number of words");
        save(n);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <label htmlFor="daily-goal" className="text-sm">
        Words per day
      </label>
      <input
        id="daily-goal"
        type="number"
        inputMode="numeric"
        min={1}
        max={100000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 500"
        className="w-28 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
