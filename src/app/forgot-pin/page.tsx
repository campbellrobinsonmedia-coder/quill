import Link from "next/link";
import type { Metadata } from "next";
import { emailEnabled } from "@/lib/email";
import { ForgotPinForm } from "./forgot-pin-form";

export const metadata: Metadata = { title: "Forgot your PIN" };

export default function ForgotPinPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Forgot your PIN?</h1>
          <p className="text-sm text-neutral-500">
            We&apos;ll email you a link to choose a new one.
          </p>
        </div>
        {emailEnabled() ? (
          <ForgotPinForm />
        ) : (
          <p className="text-center text-sm text-neutral-500">
            PIN recovery by email isn&apos;t set up for this site yet.
          </p>
        )}
        <p className="text-center text-sm text-neutral-500">
          <Link href="/login" className="underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
