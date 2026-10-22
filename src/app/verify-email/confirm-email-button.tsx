"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { confirmEmail } from "@/app/actions/account-email";

// The link only shows this button rather than confirming on load, because
// mail scanners open links automatically and would use the token up.
export function ConfirmEmailButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const [isPending, startTransition] = useTransition();

  if (state === "done") {
    return (
      <div className="space-y-3">
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Your email is confirmed.
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
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">Tap below to finish creating your account.</p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmEmail(token);
            setState(result.ok ? "done" : "failed");
          })
        }
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? "Confirming…" : "Confirm email"}
      </button>
      {state === "failed" && (
        <p role="alert" className="text-sm text-red-600">
          This link has expired or was already used.
        </p>
      )}
    </div>
  );
}
