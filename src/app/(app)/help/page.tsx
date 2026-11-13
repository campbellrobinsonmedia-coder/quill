import type { Metadata } from "next";
import { HELP } from "@/lib/help";

export const metadata: Metadata = { title: "Guide" };

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Guide</h1>
        <p className="text-sm text-neutral-500">
          What each page is for and how it works. Every page also has a &ldquo;How this page
          works&rdquo; note at the top.
        </p>
      </div>

      <nav aria-label="Guide contents" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {HELP.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-neutral-600 underline underline-offset-2 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
            {s.title}
          </a>
        ))}
      </nav>

      {HELP.map((s) => (
        <section key={s.id} id={s.id} className="scroll-mt-16 space-y-2 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{s.title}</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{s.intro}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
