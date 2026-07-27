import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ChangePinForm } from "./change-pin-form";

export default async function AccountPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  return (
    <div className="mx-auto w-full max-w-sm flex-1 space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Account</h1>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Change PIN</h2>
        <ChangePinForm />
        <p className="text-xs text-neutral-400">
          There&apos;s currently no self-serve way to recover a forgotten PIN
          without access to this page. Pick something you&apos;ll remember,
          and consider writing it down somewhere safe.
        </p>
      </section>
    </div>
  );
}
