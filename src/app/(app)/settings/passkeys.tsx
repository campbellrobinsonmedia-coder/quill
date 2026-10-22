"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { finishPasskeyRegistration, removePasskey, startPasskeyRegistration } from "@/app/actions/passkeys";
import { useToast } from "@/components/toast";

type PasskeyRow = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  backedUp: boolean;
};

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "This device";
}

function useSupportsPasskeys() {
  return useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => true
  );
}

export function Passkeys({ initial }: { initial: PasskeyRow[] }) {
  const toast = useToast();
  const router = useRouter();
  const supported = useSupportsPasskeys();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const started = await startPasskeyRegistration();
      if (!started.ok) {
        setError(started.error);
        return;
      }
      let response;
      try {
        response = await startRegistration({ optionsJSON: started.options });
      } catch (err) {
        // Closing the system prompt isn't an error worth shouting about.
        const cancelled = err instanceof Error && err.name === "NotAllowedError";
        setError(
          cancelled
            ? "That was cancelled. Try again when you're ready."
            : "This device couldn't create a passkey."
        );
        return;
      }
      const finished = await finishPasskeyRegistration(
        started.challengeId,
        response,
        name.trim() || deviceLabel()
      );
      if (!finished.ok) {
        setError(finished.error);
        return;
      }
      setName("");
      toast.success("Passkey added");
      router.refresh();
    });
  }

  function remove(row: PasskeyRow) {
    if (!window.confirm(`Remove “${row.name}”? You can still log in with your PIN.`)) return;
    startTransition(async () => {
      const result = await removePasskey(row.id);
      if (result.ok) toast.success("Passkey removed");
      else toast.error("Couldn't remove it — try again");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        A passkey lets you sign in with Face ID, a fingerprint or your device&apos;s
        screen lock instead of typing your PIN. It stays on your device, can&apos;t be
        guessed, and works only on this site.
      </p>

      {initial.length > 0 && (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {initial.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name}</p>
                <p className="text-xs text-neutral-500">
                  Added {new Date(row.createdAt).toLocaleDateString()}
                  {row.lastUsedAt
                    ? ` · last used ${new Date(row.lastUsedAt).toLocaleDateString()}`
                    : " · not used yet"}
                  {row.backedUp ? " · synced" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => remove(row)}
                className="shrink-0 text-xs text-neutral-500 hover:text-red-600 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name (optional), e.g. My iPhone"
            aria-label="Passkey name"
            className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500 sm:max-w-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="button"
            onClick={add}
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {isPending ? "Waiting for your device…" : "Add a passkey"}
          </button>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">
          This browser doesn&apos;t support passkeys. Try a recent Safari, Chrome or Edge.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
