"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  saveDraft,
  createVersionSnapshot,
  lockDraft,
  createComment,
  updateComment,
  deleteComment,
  importFdx,
} from "@/app/actions/draft";
import {
  countWords,
  estimatePageCount,
  type DraftContent,
  type ScreenplayContent,
} from "@/lib/draft-content";
import { REVISION_COLOR_SWATCH } from "@/lib/revision-colors";
import { ProseEditor } from "@/components/editor/prose-editor";
import { ScreenplayEditor, type CommentData } from "@/components/editor/screenplay-editor";
import { VersionHistory, type VersionSummary } from "@/components/editor/version-history";
import { ReadAloud } from "@/components/editor/read-aloud";

const AUTOSAVE_DELAY_MS = 1200;
const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

export function WriteEditor({
  projectId,
  initialContent,
  initialVersions,
  characterNames = [],
  locationSuggestions = [],
  initialSceneNumbersLocked = false,
  initialRevisionBaseline = null,
  initialRevisionColor = null,
  initialComments = [],
}: {
  projectId: string;
  initialContent: DraftContent;
  initialVersions: VersionSummary[];
  characterNames?: string[];
  locationSuggestions?: string[];
  initialSceneNumbersLocked?: boolean;
  initialRevisionBaseline?: ScreenplayContent | null;
  initialRevisionColor?: string | null;
  initialComments?: CommentData[];
}) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending">("saved");
  const [focusMode, setFocusMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState(initialVersions);
  const [sceneNumbersLocked, setSceneNumbersLocked] = useState(initialSceneNumbersLocked);
  const [revisionBaseline, setRevisionBaseline] = useState(initialRevisionBaseline);
  const [revisionColor, setRevisionColor] = useState(initialRevisionColor);
  const [comments, setComments] = useState(initialComments);
  const [hideAction, setHideAction] = useState(false);
  const [watermark, setWatermark] = useState("");
  const [isLocking, startLocking] = useTransition();
  const [, startTransition] = useTransition();

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

  function handleLockDraft() {
    startLocking(async () => {
      const result = await lockDraft(projectId, content);
      setContent(result.content);
      setSceneNumbersLocked(true);
      setRevisionColor(result.revisionColor);
      if (result.content.type === "screenplay") {
        setRevisionBaseline(result.content);
      }
      setVersions((prev) => [result.version, ...prev]);
    });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportFdx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (
      !window.confirm(
        "Importing an FDX file replaces the current draft. Your existing draft is saved as a version you can restore. Continue?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const xml = await file.text();
      const imported = await importFdx(projectId, xml);
      setContent(imported);
    });
  }

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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-6 py-2 text-xs text-neutral-500 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-4">
              <span>{wordCount} words</span>
              <span>{pageCount} pages</span>
              <span>
                {saveState === "saved" && "Saved"}
                {saveState === "saving" && "Saving…"}
                {saveState === "pending" && "Unsaved changes"}
              </span>
              {revisionColor && (
                <span
                  className="rounded-full border border-neutral-300 px-2 py-0.5 dark:border-neutral-700"
                  style={{ backgroundColor: REVISION_COLOR_SWATCH[revisionColor] }}
                >
                  {revisionColor} revision
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {content.type === "screenplay" && (
                <>
                  <input
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="Watermark (optional)"
                    className="w-32 rounded border border-neutral-300 bg-transparent px-1.5 py-0.5 text-xs outline-none dark:border-neutral-700"
                  />
                  <a
                    href={`/api/projects/${projectId}/export/pdf${watermark ? `?watermark=${encodeURIComponent(watermark)}` : ""}`}
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
                  <a
                    href={`/api/projects/${projectId}/export/fdx`}
                    className="hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Export FDX
                  </a>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    Import FDX
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fdx"
                    onChange={handleImportFdx}
                    className="hidden"
                  />
                  <button
                    onClick={() => setHideAction((v) => !v)}
                    className={hideAction ? "text-neutral-900 dark:text-neutral-100" : "hover:text-neutral-900 dark:hover:text-neutral-100"}
                  >
                    Read-through
                  </button>
                  <ReadAloud content={content} />
                  <button
                    onClick={handleLockDraft}
                    disabled={isLocking}
                    className="hover:text-neutral-900 disabled:opacity-60 dark:hover:text-neutral-100"
                  >
                    {isLocking ? "Locking…" : "Lock draft"}
                  </button>
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
              locationSuggestions={locationSuggestions}
              sceneNumbersLocked={sceneNumbersLocked}
              revisionBaseline={revisionBaseline}
              hideAction={hideAction}
              comments={comments}
              onCreateComment={(elementId, text) => {
                startTransition(async () => {
                  const comment = await createComment(projectId, elementId, text);
                  if (comment) setComments((prev) => [...prev, comment]);
                });
              }}
              onUpdateComment={(id, data) => {
                setComments((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, ...data } : c))
                );
                startTransition(async () => {
                  await updateComment(id, data);
                });
              }}
              onDeleteComment={(id) => {
                setComments((prev) => prev.filter((c) => c.id !== id));
                startTransition(async () => {
                  await deleteComment(id);
                });
              }}
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
