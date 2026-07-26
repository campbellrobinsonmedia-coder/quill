"use client";

import { diffDraftContent } from "@/lib/screenplay-diff";
import type { DraftContent } from "@/lib/draft-content";

export function VersionCompare({
  before,
  after,
  onClose,
}: {
  before: DraftContent;
  after: DraftContent;
  onClose: () => void;
}) {
  const rows = diffDraftContent(before, after);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-medium">Compare to current draft</h2>
          <button onClick={onClose} className="text-sm text-neutral-500">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
          {rows.map((row, i) => {
            if (row.status === "unchanged") {
              return (
                <p key={i} className="text-neutral-500">
                  {row.before}
                </p>
              );
            }
            if (row.status === "removed") {
              return (
                <p key={i} className="bg-red-50 text-red-700 line-through dark:bg-red-950 dark:text-red-400">
                  {row.before}
                </p>
              );
            }
            if (row.status === "added") {
              return (
                <p key={i} className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                  {row.after}
                </p>
              );
            }
            return (
              <div key={i}>
                <p className="bg-red-50 text-red-700 line-through dark:bg-red-950 dark:text-red-400">
                  {row.before}
                </p>
                <p className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
                  {row.after}
                </p>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="text-neutral-500">No content to compare.</p>
          )}
        </div>
      </div>
    </div>
  );
}
