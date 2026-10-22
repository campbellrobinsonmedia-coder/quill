"use client";

import { useState, useTransition } from "react";
import { requestPinReset } from "@/app/actions/account-email";

export function ForgotPinForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return (
      <p role="status" className="text-center text-sm">
        If there&apos;s an account for that address, a reset link is on its way. It
        works for one hour.
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await requestPinReset(String(formData.get("email")));
          if (result.ok) setSent(true);
          else setError(result.error ?? "Something went wrong.");
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
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
        {isPending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}
