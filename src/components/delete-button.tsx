"use client";

import { useTransition } from "react";

export function DeleteButton({
  onDelete,
  confirmMessage,
  label = "Delete",
}: {
  onDelete: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(onDelete);
      }}
      className="shrink-0 text-sm text-neutral-500 hover:text-red-600 disabled:opacity-60"
    >
      {isPending ? "Deleting…" : label}
    </button>
  );
}
