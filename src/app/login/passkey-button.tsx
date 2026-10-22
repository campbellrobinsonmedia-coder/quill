"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { rememberDevice } from "@/app/actions/auth";
import { startPasskeyLogin } from "@/app/actions/passkeys";

function useSupportsPasskeys() {
  return useSyncExternalStore(
    () => () => {},
    () => browserSupportsWebAuthn(),
    () => false
  );
}

export function PasskeyButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supported = useSupportsPasskeys();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!supported) return null;

  function signInWithPasskey() {
    setError(null);
    startTransition(async () => {
      const started = await startPasskeyLogin();
      if (!started.ok) {
        setError(started.error);
        return;
      }
      let response;
      try {
        response = await startAuthentication({ optionsJSON: started.options });
      } catch (err) {
        const cancelled = err instanceof Error && err.name === "NotAllowedError";
        setError(cancelled ? null : "This device couldn't use a passkey.");
        return;
      }
      const res = await signIn("passkey", {
        challengeId: started.challengeId,
        response: JSON.stringify(response),
        redirect: false,
      });
      if (res?.error) {
        setError(
          res.code === "too_many_attempts"
            ? "Too many failed attempts. Try again in 15 minutes."
            : res.code === "email_not_verified"
              ? "Confirm your email first — check your inbox for the link."
              : "That passkey isn't registered here. Log in with your PIN, then add it in Settings."
        );
        return;
      }
      // Best effort: failing to remember this device must never block signing in.
      await rememberDevice().catch(() => {});
      router.push(searchParams.get("callbackUrl") || "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        or
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <button
        type="button"
        onClick={signInWithPasskey}
        disabled={isPending}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        {isPending ? "Waiting for your device…" : "Sign in with a passkey"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
