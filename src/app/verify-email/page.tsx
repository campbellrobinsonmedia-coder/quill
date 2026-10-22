import Link from "next/link";
import type { Metadata } from "next";
import { peekToken } from "@/lib/auth-tokens";
import { ConfirmEmailButton } from "./confirm-email-button";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await peekToken(token, "VERIFY_EMAIL") : false;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Confirm your email</h1>
        {valid && token ? (
          <ConfirmEmailButton token={token} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">
              This link has expired or was already used. Log in and we&apos;ll offer
              to send you a new one.
            </p>
            <Link href="/login" className="text-sm underline underline-offset-2">
              Go to log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
