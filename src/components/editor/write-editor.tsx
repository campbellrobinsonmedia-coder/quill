"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  saveDraft,
  overwriteDraft,
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
import { Menu, MENU_ITEM } from "@/components/menu";

const AUTOSAVE_DELAY_MS = 1200;
const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

const TOOLBAR_ITEM =
  "inline-flex h-11 items-center rounded px-2 hover:text-neutral-900 sm:h-9 dark:hover:text-neutral-100";

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function WriteEditor({
  projectId,
  initialContent,
  initialRevision,
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
  initialRevision: number;
  initialVersions: VersionSummary[];
  characterNames?: string[];
  locationSuggestions?: string[];
  initialSceneNumbersLocked?: boolean;
  initialRevisionBaseline?: ScreenplayContent | null;
  initialRevisionColor?: string | null;
  initialComments?: CommentData[];
}) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "pending" | "error" | "conflict">("saved");
  const [recovery, setRecovery] = useState<{ content: DraftContent; at: number } | null>(null);
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
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const contentRef = useRef(content);
  const revisionRef = useRef(initialRevision);
  const conflictRef = useRef(false);
  const inFlight = useRef<Promise<void>>(Promise.resolve());
  const dirtyRef = useRef(false);
  const lastSnapshotAt = useRef<number>(0);
  const isFirstRender = useRef(true);
  const backupKey = `quill:draft-backup:${projectId}`;

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    lastSnapshotAt.current = initialVersions[0]
      ? new Date(initialVersions[0].createdAt).getTime()
      : Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A copy of unsaved text kept on this device, so a failed save, a lost
  // connection, or a closed tab never costs the writer their words.
  function writeBackup() {
    try {
      localStorage.setItem(
        backupKey,
        JSON.stringify({
          content: contentRef.current,
          baseRevision: revisionRef.current,
          at: Date.now(),
        })
      );
    } catch {
      // Storage unavailable or full; the in-memory copy is all we have.
    }
  }

  function clearBackup() {
    try {
      localStorage.removeItem(backupKey);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const backup = JSON.parse(raw) as { content: DraftContent; at: number };
      if (JSON.stringify(backup.content) === JSON.stringify(initialContent)) {
        localStorage.removeItem(backupKey);
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecovery({ content: backup.content, at: backup.at });
    } catch {
      // Corrupt backup; ignore it.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scheduleRetry() {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    const delay = [5000, 15000, 45000][Math.min(retryCount.current, 2)];
    retryCount.current += 1;
    retryTimer.current = setTimeout(() => {
      void performSave();
    }, delay);
  }

  async function doSave() {
    if (conflictRef.current) return;
    setSaveState("saving");
    const snapshot = contentRef.current;
    try {
      const result = await saveDraft(projectId, snapshot, revisionRef.current);
      if (!result.ok) {
        conflictRef.current = true;
        writeBackup();
        setSaveState("conflict");
        return;
      }
      revisionRef.current = result.revision;
      retryCount.current = 0;
      setLastSavedAt(new Date());
      if (contentRef.current === snapshot) {
        dirtyRef.current = false;
        setSaveState("saved");
        clearBackup();
      } else {
        // Typed during the save; the content effect has already queued another.
        setSaveState("pending");
      }

      if (Date.now() - lastSnapshotAt.current >= AUTO_SNAPSHOT_INTERVAL_MS) {
        const version = await createVersionSnapshot(
          projectId,
          snapshot,
          "Autosave checkpoint"
        );
        lastSnapshotAt.current = Date.now();
        setVersions((prev) => [version, ...prev]);
      }
    } catch {
      writeBackup();
      setSaveState("error");
      scheduleRetry();
    }
  }

  // Saves run one at a time: two overlapping saves would share a base
  // revision, and the second would be rejected as a conflict with the first.
  function performSave(): Promise<void> {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    const run = inFlight.current.then(doSave);
    inFlight.current = run.catch(() => {});
    return run;
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    dirtyRef.current = true;
    if (conflictRef.current) return;
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
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (dirtyRef.current && !conflictRef.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const latest = contentRef.current;
        inFlight.current
          .then(() => saveDraft(projectId, latest, revisionRef.current))
          .then((result) => {
            if (!result.ok) writeBackup();
          })
          .catch(() => writeBackup());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before closing/reloading the tab with an unsaved edit still pending,
  // and keep a local copy in case the tab is killed anyway (mobile Safari
  // often skips beforeunload).
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        writeBackup();
        e.preventDefault();
        e.returnValue = "";
      }
    }
    function handleHidden() {
      if (document.visibilityState === "hidden" && dirtyRef.current) writeBackup();
    }
    function handleOnline() {
      if (dirtyRef.current && !conflictRef.current) void performSave();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleHidden);
    document.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleHidden);
      document.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function keepMyVersion() {
    startTransition(async () => {
      const result = await overwriteDraft(projectId, contentRef.current);
      revisionRef.current = result.revision;
      conflictRef.current = false;
      dirtyRef.current = false;
      setSaveState("saved");
      setLastSavedAt(new Date());
      clearBackup();
    });
  }

  function loadLatest() {
    // The other copy wins; our edits stay in the local backup for recovery.
    dirtyRef.current = false;
    window.location.reload();
  }

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
      await performSave();
      if (conflictRef.current) return;
      const result = await lockDraft(projectId, contentRef.current);
      revisionRef.current = result.revision;
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
      await performSave();
      if (conflictRef.current) return;
      const result = await importFdx(projectId, xml);
      revisionRef.current = result.revision;
      setContent(result.content);
    });
  }

  const exportMenuItems = (
    <>
      <label className="block px-3 pb-1 pt-2 text-xs text-neutral-500">
        PDF watermark (optional)
        <input
          value={watermark}
          onChange={(e) => setWatermark(e.target.value)}
          aria-label="Watermark for PDF export"
          className="mt-1 block w-full rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none dark:border-neutral-700"
        />
      </label>
      <a
        href={`/api/projects/${projectId}/export/pdf${watermark ? `?watermark=${encodeURIComponent(watermark)}` : ""}`}
        className={MENU_ITEM}
      >
        PDF
      </a>
      <a
        href={`/api/projects/${projectId}/export/fountain`}
        className={MENU_ITEM}
      >
        Fountain
      </a>
      <a
        href={`/api/projects/${projectId}/export/fdx`}
        className={MENU_ITEM}
      >
        Final Draft (FDX)
      </a>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`${MENU_ITEM} border-t border-neutral-100 dark:border-neutral-800`}
      >
        Import FDX…
      </button>
    </>
  );

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
                  On a phone,
                </span>{" "}
                the bar above the keyboard changes the line format.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Autosave
                </span>{" "}
                saves as you type — no save button needed.
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Plan
                </span>{" "}
                tab holds your beats and index cards for planning structure.
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-2 text-xs text-neutral-500 sm:px-6 dark:border-neutral-800">
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
                    Not saved — retrying. A copy is kept on this device.{" "}
                    <button onClick={performSave} className="underline">
                      Retry now
                    </button>
                  </span>
                )}
                {saveState === "conflict" && (
                  <span className="text-red-600">Edited elsewhere — not saved</span>
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
            <div className="ml-auto flex items-center gap-1 sm:hidden">
              <Menu label="Menu" buttonClassName={TOOLBAR_ITEM}>
                {content.type === "screenplay" && (
                  <>
                    {exportMenuItems}
                    <button
                      type="button"
                      onClick={() => setHideAction((v) => !v)}
                      aria-pressed={hideAction}
                      className={`${MENU_ITEM} border-t border-neutral-100 dark:border-neutral-800`}
                    >
                      {hideAction ? "Show action lines" : "Dialogue only"}
                    </button>
                    <ReadAloud content={content} className={MENU_ITEM} />
                    <button
                      type="button"
                      onClick={handleLockDraft}
                      disabled={isLocking}
                      className={`${MENU_ITEM} disabled:opacity-60`}
                    >
                      {isLocking ? "Locking…" : "Lock revision"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className={MENU_ITEM}
                >
                  History
                </button>
              </Menu>
              <button
                onClick={() => setFocusMode(true)}
                className="inline-flex h-11 items-center rounded-md border border-neutral-300 px-3 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                Focus
              </button>
            </div>
            <div className="hidden flex-wrap items-center gap-1 sm:flex">
              {content.type === "screenplay" && (
                <>
                  <Menu label="Export" buttonClassName={TOOLBAR_ITEM}>
                    {exportMenuItems}
                  </Menu>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".fdx"
                    onChange={handleImportFdx}
                    className="hidden"
                  />

                  <button
                    onClick={() => setHideAction((v) => !v)}
                    aria-pressed={hideAction}
                    title="Hide action lines to read dialogue on its own"
                    className={
                      hideAction
                        ? `${TOOLBAR_ITEM} font-medium text-neutral-900 dark:text-neutral-100`
                        : TOOLBAR_ITEM
                    }
                  >
                    Dialogue only
                  </button>
                  <ReadAloud content={content} className={TOOLBAR_ITEM} />
                  <button
                    onClick={handleLockDraft}
                    disabled={isLocking}
                    title="Assign permanent scene numbers and start a new revision"
                    className={`${TOOLBAR_ITEM} disabled:opacity-60`}
                  >
                    {isLocking ? "Locking…" : "Lock revision"}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowHistory((v) => !v)}
                className={TOOLBAR_ITEM}
              >
                History
              </button>
              <button
                onClick={() => setFocusMode(true)}
                className="inline-flex h-11 items-center rounded-md border border-neutral-300 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-50 sm:h-9 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                Focus
              </button>
            </div>
          </div>
        )}

        {saveState === "conflict" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:px-6 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          >
            <p className="min-w-0 flex-1">
              This script was changed on another device or tab, so your latest
              edits haven&apos;t been saved. Choose which copy to keep — the
              other one is saved to version history either way.
            </p>
            <div className="flex gap-2">
              <button
                onClick={keepMyVersion}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white"
              >
                Keep my version
              </button>
              <button
                onClick={loadLatest}
                className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium dark:border-red-800"
              >
                Load the other copy
              </button>
            </div>
          </div>
        )}

        {recovery && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            <p className="min-w-0 flex-1">
              Found unsaved changes from this device (
              {new Date(recovery.at).toLocaleString()}).
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setContent(recovery.content);
                  setRecovery(null);
                }}
                className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white"
              >
                Restore them
              </button>
              <button
                onClick={() => {
                  clearBackup();
                  setRecovery(null);
                }}
                className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium dark:border-amber-800"
              >
                Discard
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

        <div
          className={`min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 ${
            content.type === "screenplay" ? "bg-neutral-100 dark:bg-black" : "sm:py-8"
          }`}
        >
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
          onBeforeRestore={performSave}
          onRestore={(restored, revision) => {
            revisionRef.current = revision;
            setContent(restored);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
      </div>
    </>
  );
}
