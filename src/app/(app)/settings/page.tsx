import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ChangePinForm } from "./change-pin-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { CHANGELOG, ROADMAP } from "@/lib/changelog";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-10 p-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Account</h2>
        <ChangePinForm />
        <p className="text-xs text-neutral-400">
          There&apos;s currently no self-serve way to recover a forgotten PIN
          without access to this page. Pick something you&apos;ll remember,
          and consider writing it down somewhere safe.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Planned</h2>
        <ul className="space-y-2 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
          {ROADMAP.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-700" />
              <span className="text-neutral-600 dark:text-neutral-400">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-medium text-neutral-500">Changelog</h2>
        <ol className="space-y-6 border-l border-neutral-200 pl-6 dark:border-neutral-800">
          {[...CHANGELOG].reverse().map((release) => (
            <li key={release.version} className="relative">
              <span className="absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full bg-neutral-900 dark:bg-white" />
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium tabular-nums text-neutral-400">
                  {release.version}
                </span>
                <h3 className="text-sm font-semibold">{release.title}</h3>
              </div>
              <ul className="mt-2 space-y-1">
                {release.items.map((item, i) => (
                  <li key={i} className="text-sm text-neutral-600 dark:text-neutral-400">
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
