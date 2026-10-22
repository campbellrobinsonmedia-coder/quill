import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ChangePinForm } from "./change-pin-form";
import { GoalForm } from "./goal-form";
import { RestoreBackup } from "./restore-backup";
import { ThemeToggle } from "@/components/theme-toggle";
import { CHANGELOG, ROADMAP } from "@/lib/changelog";
import { emailEnabled } from "@/lib/email";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, dailyWordGoal: true },
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-10 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Writing goal</h2>
        <GoalForm initialGoal={user.dailyWordGoal} />
        <p className="text-xs text-neutral-500">
          Counts net new words saved in the editor each day, in your local time.
          Leave blank for no goal.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Backup</h2>
        <a
          href="/api/export"
          className="inline-block rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Download everything (JSON)
        </a>
        <p className="text-xs text-neutral-500">
          Every project, script, outline, character, world note, beat, idea, and
          series in one file. Uploaded files are listed by link, not embedded.
        </p>
        <RestoreBackup />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Keyboard shortcuts</h2>
        <ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li><kbd className="rounded border border-neutral-300 px-1.5 text-xs dark:border-neutral-700">/</kbd> or <kbd className="rounded border border-neutral-300 px-1.5 text-xs dark:border-neutral-700">⌘K</kbd> Jump to any script, series or episode, or search</li>
          <li><kbd className="rounded border border-neutral-300 px-1.5 text-xs dark:border-neutral-700">i</kbd> Quick-add an idea</li>
          <li><kbd className="rounded border border-neutral-300 px-1.5 text-xs dark:border-neutral-700">Esc</kbd> Close the quick-add box</li>
        </ul>
        <p className="text-xs text-neutral-500">Shortcuts are ignored while you&apos;re typing in a field.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Account</h2>
        <ChangePinForm />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {emailEnabled()
            ? `If you forget your PIN, a reset link can be emailed to ${user.email} from the log-in page.`
            : "PIN recovery by email isn't set up for this site yet, so there's no way to recover a forgotten PIN. Pick something you'll remember, and consider writing it down somewhere safe."}
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
                <span className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
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
