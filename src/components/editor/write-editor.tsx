"use client";

import { useEffect, useRef, useState } from "react";
import { saveDraft, createVersionSnapshot } from "@/app/actions/draft";
import {
  countWords,
  estimatePageCount,
  type DraftContent,
} from "@/lib/draft-content";
import { ProseEditor } from "@/components/editor/prose-editor";
import { ScreenplayEditor } from "@/components/editor/screenplay-editor";
import { VersionHistory, type VersionSummary } from "@/components/editor/version-history";

const AUTOSAVE_DELAY_MS = 1200;
const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

export function WriteEditor({
  projectId,
  initialContent,
  initialVersions,
  characterNames = [],
}: {
  projectId: string;
  initialContent: DraftContent;
  initialVersions: VersionSummary[];
  characterNames?: string[];
}) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending">("saved");
  const [focusMode, setFocusMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState(initialVersions);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotAt = useRef<number>(
    initialVersions[0] ? new Date(initialVersions[0].createdAt).getTime() : Date.now()
  );
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSaveState("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      await saveDraft(projectId, content);
      setSaveState("saved");

      if (Date.now() - lastSnapshotAt.current >= AUTO_SNAPSHOT_INTERVAL_MS) {
        const version = await createVersionSnapshot(projectId, content, "Autosave checkpoint");
        lastSnapshotAt.current = Date.now();
        setVersions((prev) => [version, ...prev]);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const wordCount = countWords(content);
  const pageCount = estimatePageCount(content);

  return (
    <div
      className={
        focusMode
          ? "fixed inset-0 z-50 flex bg-white dark:bg-neutral-950"
          : "flex flex-1"
      }
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {!focusMode && (
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-2 text-xs text-neutral-500 dark:border-neutral-800">
            <div className="flex gap-4">
              <span>{wordCount} words</span>
              <span>{pageCount} pages</span>
              <span>
                {saveState === "saved" && "Saved"}
                {saveState === "saving" && "Saving…"}
                {saveState === "pending" && "Unsaved changes"}
              </span>
            </div>
            <div className="flex gap-4">
              {content.type === "screenplay" && (
                <>
                  <a
                    href={`/api/projects/${projectId}/export/pdf`}
                    className="hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Export PDF
                  </a>
                  <a
                    href={`/api/projects/${projectId}/export/fountain`}
                    className="hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Export Fountain
                  </a>
                </>
              )}
              <button onClick={() => setShowHistory((v) => !v)} className="hover:text-neutral-900 dark:hover:text-neutral-100">
                History
              </button>
              <button onClick={() => setFocusMode(true)} className="hover:text-neutral-900 dark:hover:text-neutral-100">
                Focus mode
              </button>
            </div>
          </div>
        )}

        {focusMode && (
          <button
            onClick={() => setFocusMode(false)}
            className="fixed right-4 top-4 z-10 rounded-full bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-neutral-900"
          >
            Exit focus
          </button>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-8">
          {content.type === "prose" ? (
            <ProseEditor
              content={content}
              onChange={(next) => setContent(next)}
            />
          ) : (
            <ScreenplayEditor
              content={content}
              onChange={(next) => setContent(next)}
              characterNames={characterNames}
            />
          )}
        </div>
      </div>

      {showHistory && !focusMode && (
        <VersionHistory
          projectId={projectId}
          content={content}
          versions={versions}
          onVersionsChange={setVersions}
          onRestore={(restored) => setContent(restored)}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
