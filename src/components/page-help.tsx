import Link from "next/link";
import { HELP_BY_ID } from "@/lib/help";

// A collapsed "How this page works" note at the top of a page. Plain <details>,
// so it needs no JavaScript and works on every page, server or client.
export function PageHelp({ id }: { id: string }) {
  const section = HELP_BY_ID.get(id);
  if (!section) return null;
  return (
    <details className="group rounded-md border border-neutral-200 bg-neutral-50 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
        <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-semibold">
          ?
        </span>
        How this page works
      </summary>
      <div className="space-y-2 border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
        <p className="text-neutral-700 dark:text-neutral-300">{section.intro}</p>
        <ul className="list-disc space-y-1.5 pl-5 text-neutral-600 dark:text-neutral-400">
          {section.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500">
          <Link href={`/help#${section.id}`} className="underline underline-offset-2">
            Open the full guide
          </Link>
        </p>
      </div>
    </details>
  );
}
