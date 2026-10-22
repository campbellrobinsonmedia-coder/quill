"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { rememberDevice } from "@/app/actions/auth";
import { resendVerification } from "@/app/actions/account-email";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: email.trim(),
        password: String(formData.get("pin")),
        redirect: false,
      });
      if (res?.error) {
        if (res.code === "email_not_verified") {
          setNeedsVerification(true);
          return;
        }
        setError(
          res.code === "too_many_attempts"
            ? "Too many failed attempts. Try again in 15 minutes."
            : "Incorrect email or PIN"
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
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="pin" className="text-sm font-medium">
          PIN
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      {needsVerification && (
        <div role="alert" className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p>Confirm your email first — we sent you a link when you signed up.</p>
          {resent ? (
            <p>Sent. Check your inbox (and spam).</p>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await resendVerification(email);
                  setResent(true);
                });
              }}
              className="underline underline-offset-2"
            >
              Send the link again
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
      >
        {isPending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
