"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPin } from "@/app/actions/account-email";

export function ResetPinForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Your PIN has been changed.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await resetPin(token, String(formData.get("pin")));
          if (result.ok) setDone(true);
          else setError(result.error ?? "Something went wrong.");
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <label htmlFor="pin" className="text-sm font-medium">
          New 4-digit PIN
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          autoComplete="off"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? "Saving…" : "Save new PIN"}
      </button>
    </form>
  );
}
