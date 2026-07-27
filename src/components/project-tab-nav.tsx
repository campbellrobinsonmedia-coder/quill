"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Outline" },
    { href: `${base}/characters`, label: "Characters" },
    { href: `${base}/world`, label: "World" },
    { href: `${base}/ideas`, label: "Ideas" },
    { href: `${base}/write`, label: "Write" },
    { href: `${base}/reports`, label: "Reports" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <div className="relative border-b border-neutral-200 dark:border-neutral-800">
      <nav className="flex gap-1 overflow-x-auto px-6 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive =
            tab.href === base ? pathname === base : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 border-b-2 px-3 py-3 -mb-px ${
                isActive
                  ? "border-neutral-900 font-medium dark:border-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent dark:from-neutral-950"
      />
    </div>
  );
}
