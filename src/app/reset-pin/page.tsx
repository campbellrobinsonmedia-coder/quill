import Link from "next/link";
import type { Metadata } from "next";
import { peekToken } from "@/lib/auth-tokens";
import { ResetPinForm } from "./reset-pin-form";

export const metadata: Metadata = { title: "Choose a new PIN" };

export default async function ResetPinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await peekToken(token, "RESET_PIN") : false;

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-semibold">Choose a new PIN</h1>
        {valid && token ? (
          <ResetPinForm token={token} />
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm text-neutral-500">
              This link has expired or was already used.
            </p>
            <Link href="/forgot-pin" className="text-sm underline underline-offset-2">
              Send me a new link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
