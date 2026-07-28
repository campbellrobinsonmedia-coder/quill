"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const TOOLBAR_ITEM =
  "inline-flex h-11 items-center px-2 hover:text-neutral-900 dark:hover:text-neutral-100";

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const [showIntro, setShowIntro] = useState(() => searchParams.get("intro") === "1");
  const [scrollToSceneId, setScrollToSceneId] = useState(() => searchParams.get("scene"));

  function dismissIntro() {
    setShowIntro(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("intro");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }

  function clearSceneParam() {
    setScrollToSceneId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("scene");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const dirtyRef = useRef(false);
  const lastSnapshotAt = useRef<number>(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    lastSnapshotAt.current = initialVersions[0]
      ? new Date(initialVersions[0].createdAt).getTime()
      : Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function performSave() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveState("saving");
    try {
      await saveDraft(projectId, contentRef.current);
      dirtyRef.current = false;
      setSaveState("saved");
      setLastSavedAt(new Date());

      if (Date.now() - lastSnapshotAt.current >= AUTO_SNAPSHOT_INTERVAL_MS) {
        const version = await createVersionSnapshot(
          projectId,
          contentRef.current,
          "Autosave checkpoint"
        );
        lastSnapshotAt.current = Date.now();
        setVersions((prev) => [version, ...prev]);
      }
    } catch {
      setSaveState("error");
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    setSaveState("pending");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(performSave, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Flush an unsaved change immediately when navigating away within the app
  // (client-side route changes unmount this component but don't fire beforeunload).
  useEffect(() => {
    return () => {
      if (dirtyRef.current && saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveDraft(projectId, contentRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing/reloading the tab with an unsaved edit still pending.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const wordCount = countWords(content);
  const pageCount = estimatePageCount(content);

  function handleLockDraft() {
    if (
      !window.confirm(
        "Lock this draft to assign permanent scene numbers and start a new revision. From now on, changes you make will be marked with revision asterisks against this locked version, the way a page lock works in Final Draft. Continue?"
      )
    ) {
      return;
    }
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
    <>
      {showIntro && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-md bg-white p-5 dark:bg-neutral-900">
            <h2 className="text-lg font-semibold">Quick tour</h2>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Enter
                </span>{" "}
                moves to the next line in a sensible next format.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Tab
                </span>{" "}
                cycles the current line&apos;s format.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Autosave
                </span>{" "}
                saves as you type — no save button needed.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Outline
                </span>{" "}
                tab holds your index cards for planning structure.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Export
                </span>{" "}
                to PDF, Fountain, or FDX any time from this toolbar.
              </li>
            </ul>
            <button
              onClick={dismissIntro}
              className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Got it
            </button>
          </div>
        </div>
      )}
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
                {saveState === "saved" &&
                  (lastSavedAt ? `Saved at ${formatTime(lastSavedAt)}` : "Saved")}
                {saveState === "saving" && "Saving…"}
                {saveState === "pending" && "Unsaved changes"}
                {saveState === "error" && (
                  <span className="text-red-600">
                    Save failed —{" "}
                    <button onClick={performSave} className="underline">
                      Retry
                    </button>
                  </span>
                )}
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
            <div className="flex flex-wrap items-center gap-1">
              {content.type === "screenplay" && (
                <>
                  <div className="flex flex-wrap items-center gap-1 border-r border-neutral-200 pr-1 dark:border-neutral-800">
                    <input
                      value={watermark}
                      onChange={(e) => setWatermark(e.target.value)}
                      placeholder="Watermark (optional)"
                      aria-label="Watermark for PDF export"
                      className="h-11 w-28 rounded border border-neutral-300 bg-transparent px-1.5 text-xs outline-none dark:border-neutral-700"
                    />
                    <a
                      href={`/api/projects/${projectId}/export/pdf${watermark ? `?watermark=${encodeURIComponent(watermark)}` : ""}`}
                      className={TOOLBAR_ITEM}
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/projects/${projectId}/export/fountain`}
                      className={TOOLBAR_ITEM}
                    >
                      Fountain
                    </a>
                    <a
                      href={`/api/projects/${projectId}/export/fdx`}
                      className={TOOLBAR_ITEM}
                    >
                      FDX
                    </a>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={TOOLBAR_ITEM}
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
                  </div>

                  <div className="flex flex-wrap items-center gap-1 border-r border-neutral-200 pr-1 dark:border-neutral-800">
                    <button
                      onClick={() => setHideAction((v) => !v)}
                      title="Hide action lines to read dialogue on its own"
                      className={
                        hideAction
                          ? `${TOOLBAR_ITEM} text-neutral-900 dark:text-neutral-100`
                          : TOOLBAR_ITEM
                      }
                    >
                      Hide action lines
                    </button>
                    <ReadAloud content={content} className={TOOLBAR_ITEM} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1 border-r border-neutral-200 pr-1 dark:border-neutral-800">
                    <button
                      onClick={handleLockDraft}
                      disabled={isLocking}
                      title="Assign permanent scene numbers and start a new revision"
                      className={`${TOOLBAR_ITEM} disabled:opacity-60`}
                    >
                      {isLocking ? "Locking…" : "Lock revision"}
                    </button>
                    <button
                      onClick={() => setShowHistory((v) => !v)}
                      className={TOOLBAR_ITEM}
                    >
                      History
                    </button>
                  </div>
                </>
              )}
              {content.type === "prose" && (
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className={TOOLBAR_ITEM}
                >
                  History
                </button>
              )}
              <button
                onClick={() => setFocusMode(true)}
                className="inline-flex h-11 items-center rounded-md bg-neutral-900 px-3 text-xs font-medium text-white dark:bg-white dark:text-neutral-900"
              >
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
              scrollToElementId={scrollToSceneId}
              onScrolledToElement={clearSceneParam}
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
    </>
  );
}
