"use client";

import { useState } from "react";

export function CollapsibleSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-center gap-1 rounded-md border border-neutral-300 text-sm font-medium dark:border-neutral-700"
      >
        {open ? "−" : "+"} {label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
