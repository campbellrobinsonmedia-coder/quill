"use client";

import { useState, useTransition } from "react";
import { createVersionSnapshot, restoreVersion, getVersionContent } from "@/app/actions/draft";
import type { DraftContent } from "@/lib/draft-content";
import { VersionCompare } from "@/components/editor/version-compare";

export type VersionSummary = {
  id: string;
  wordCount: number;
  label: string | null;
  createdAt: Date;
};

export function VersionHistory({
  projectId,
  content,
  versions,
  onVersionsChange,
  onRestore,
  onClose,
}: {
  projectId: string;
  content: DraftContent;
  versions: VersionSummary[];
  onVersionsChange: (versions: VersionSummary[]) => void;
  onRestore: (content: DraftContent) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [compareContent, setCompareContent] = useState<DraftContent | null>(null);

  function saveSnapshot() {
    startTransition(async () => {
      const version = await createVersionSnapshot(projectId, content, label.trim() || undefined);
      onVersionsChange([version, ...versions]);
      setLabel("");
    });
  }

  function restore(versionId: string) {
    setRestoringId(versionId);
    startTransition(async () => {
      const restored = await restoreVersion(projectId, versionId);
      onRestore(restored);
      setRestoringId(null);
    });
  }

  function compare(versionId: string) {
    startTransition(async () => {
      const versionContent = await getVersionContent(projectId, versionId);
      setCompareContent(versionContent);
    });
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-medium">Version history</h2>
        <button onClick={onClose} className="text-sm text-neutral-500">
          Close
        </button>
      </div>
      <div className="space-y-2 border-b border-neutral-200 p-4 dark:border-neutral-800">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={saveSnapshot}
          disabled={isPending}
          className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          Save version now
        </button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {versions.length === 0 && (
          <li className="p-4 text-sm text-neutral-500">No saved versions yet.</li>
        )}
        {versions.map((v) => (
          <li key={v.id} className="border-b border-neutral-100 p-4 text-sm dark:border-neutral-900">
            <p className="font-medium">{v.label || "Untitled snapshot"}</p>
            <p className="text-xs text-neutral-500">
              {new Date(v.createdAt).toLocaleString()} · {v.wordCount} words
            </p>
            <div className="mt-1 flex gap-3">
              <button
                onClick={() => restore(v.id)}
                disabled={isPending}
                className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-60 dark:hover:text-neutral-100"
              >
                {restoringId === v.id ? "Restoring…" : "Restore"}
              </button>
              <button
                onClick={() => compare(v.id)}
                disabled={isPending}
                className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900 disabled:opacity-60 dark:hover:text-neutral-100"
              >
                Compare to current
              </button>
            </div>
          </li>
        ))}
      </ul>

      {compareContent && (
        <VersionCompare
          before={compareContent}
          after={content}
          onClose={() => setCompareContent(null)}
        />
      )}
    </div>
  );
}
