"use client";

import { useActionState } from "react";
import { changePinAction, type ChangePinState } from "@/app/actions/auth";

const initialState: ChangePinState = {};

export function ChangePinForm() {
  const [state, formAction, isPending] = useActionState(
    changePinAction,
    initialState
  );

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1">
        <label htmlFor="currentPin" className="text-sm font-medium">
          Current PIN
        </label>
        <input
          id="currentPin"
          name="currentPin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="newPin" className="text-sm font-medium">
          New 4-digit PIN
        </label>
        <input
          id="newPin"
          name="newPin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          autoComplete="new-password"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-600">PIN updated.</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? "Saving…" : "Update PIN"}
      </button>
    </form>
  );
}
