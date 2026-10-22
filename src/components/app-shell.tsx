"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { CommandPalette } from "@/components/command-palette";
import { emitShellEvent, OPEN_PALETTE_EVENT } from "@/lib/shell-events";
import type { SidebarData } from "@/lib/sidebar-data";

const SIDEBAR_PREF_KEY = "quill:sidebar";
const ICON_BUTTON =
  "h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800";

function MenuIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function AppShell({
  data,
  logoutAction,
  children,
}: {
  data: SidebarData;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarPref, setSidebarPref] = useState<"open" | "closed" | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Navigating closes the phone drawer.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_PREF_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "open" || saved === "closed") setSidebarPref(saved);
    } catch {
      // Storage unavailable; fall back to the default.
    }
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  // The script editor wants the width, so the sidebar starts closed there
  // unless the writer has chosen otherwise.
  const onWritePage = pathname.endsWith("/write");
  const sidebarOpen = (sidebarPref ?? (onWritePage ? "closed" : "open")) === "open";

  function toggleSidebar() {
    const next = sidebarOpen ? "closed" : "open";
    setSidebarPref(next);
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white/90 px-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className={`${ICON_BUTTON} inline-flex lg:hidden`}
        >
          <MenuIcon />
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          aria-pressed={sidebarOpen}
          className={`${ICON_BUTTON} hidden lg:inline-flex`}
        >
          <MenuIcon />
        </button>
        <Link href="/dashboard" className="px-1 font-semibold tracking-tight">
          Quill
        </Link>

        <div className="ml-auto flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => emitShellEvent(OPEN_PALETTE_EVENT)}
            aria-label="Search or jump to"
            className="hidden h-9 items-center gap-2 rounded-md border border-neutral-200 px-3 text-neutral-500 hover:bg-neutral-50 sm:inline-flex dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <SearchIcon />
            <span>Search or jump to…</span>
            <kbd className="rounded border border-neutral-300 px-1 text-[10px] dark:border-neutral-700">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => emitShellEvent(OPEN_PALETTE_EVENT)}
            aria-label="Search or jump to"
            className={`${ICON_BUTTON} inline-flex sm:hidden`}
          >
            <SearchIcon />
          </button>
          <Link
            href="/settings"
            className="hidden rounded-md px-3 py-2 text-neutral-600 hover:bg-neutral-100 sm:block dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Settings
          </Link>
          <form action={logoutAction} className="hidden sm:block">
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-64 shrink-0 overflow-y-auto border-r border-neutral-200 lg:block dark:border-neutral-800">
            <SidebarNav data={data} />
          </aside>
        )}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-neutral-950">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-800">
              <span className="px-1 font-semibold tracking-tight">Quill</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className={`${ICON_BUTTON} inline-flex`}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav data={data} />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <Link href="/settings" className="rounded-md px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                Settings
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <CommandPalette data={data} />
    </div>
  );
}
