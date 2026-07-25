"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Outline" },
    { href: `${base}/characters`, label: "Characters" },
    { href: `${base}/ideas`, label: "Ideas" },
    { href: `${base}/write`, label: "Write" },
  ];

  return (
    <nav className="flex gap-1 border-b border-neutral-200 px-6 text-sm dark:border-neutral-800">
      {tabs.map((tab) => {
        const isActive =
          tab.href === base ? pathname === base : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-3 -mb-px ${
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
  );
}
