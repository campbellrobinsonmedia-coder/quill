"use client";

import { useEffect, useRef, useState } from "react";

export function Menu({
  label,
  children,
  buttonClassName = "",
}: {
  label: string;
  children: React.ReactNode;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName}
      >
        {label} <span aria-hidden>▾</span>
      </button>
      {/* Kept mounted (just hidden) so stateful items like Read aloud survive closing. */}
      <div
          hidden={!open}
          role="menu"
          // Choosing a link or button closes the menu; typing in an input inside it doesn't.
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
          }}
          className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          {children}
        </div>
    </div>
  );
}

export const MENU_ITEM =
  "block w-full rounded px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800";
