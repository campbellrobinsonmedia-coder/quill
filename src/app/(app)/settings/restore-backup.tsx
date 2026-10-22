"use client";

import { useRef, useState, useTransition } from "react";
import { previewBackup, restoreBackup } from "@/app/actions/backup";
import type { RestoreMode, RestoreSummary } from "@/lib/backup-restore";
import { BACKUP_KINDS, KIND_LABELS } from "@/lib/backup";
import { useToast } from "@/components/toast";

const MODES: { id: RestoreMode; label: string; help: string }[] = [
  {
    id: "missing",
    label: "Restore what's missing",
    help: "Brings back anything that isn't in your account anymore. Anything that's still here is left exactly as it is.",
  },
  {
    id: "copies",
    label: "Add everything as copies",
    help: "Imports the whole file as new items next to what you have. Scripts and series are labelled “(restored copy)”.",
  },
];

export function RestoreBackup() {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<RestoreMode>("missing");
  const [summary, setSummary] = useState<RestoreSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<RestoreSummary | null>(null);

  function preview(nextText: string, nextMode: RestoreMode) {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      try {
        setSummary(await previewBackup(nextText, nextMode));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't read that file.");
      }
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDone(null);
    setFileName(file.name);
    const content = await file.text();
    setText(content);
    preview(content, mode);
  }

  function changeMode(next: RestoreMode) {
    setMode(next);
    if (text) preview(text, next);
  }

  function reset() {
    setText(null);
    setSummary(null);
    setFileName("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function run() {
    if (!text) return;
    startTransition(async () => {
      try {
        const result = await restoreBackup(text, mode);
        setDone(result);
        reset();
        toast.success("Backup restored");
      } catch {
        toast.error("The restore failed, and nothing was changed.");
      }
    });
  }

  const total = summary
    ? BACKUP_KINDS.reduce((sum, k) => sum + summary.counts[k].create, 0)
    : 0;
  const rows = (s: RestoreSummary) =>
    BACKUP_KINDS.filter((k) => s.counts[k].create + s.counts[k].skip + s.counts[k].drop > 0);

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-neutral-600 dark:text-neutral-400">
          Restore from a backup file
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-transparent file:px-3 file:py-1.5 file:text-sm dark:file:border-neutral-700"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {text && !error && (
        <fieldset className="space-y-2">
          <legend className="sr-only">How to restore</legend>
          {MODES.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="restore-mode"
                checked={mode === m.id}
                onChange={() => changeMode(m.id)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{m.label}</span>
                <span className="block text-xs text-neutral-500">{m.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {summary && (
        <div className="space-y-2 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="text-xs text-neutral-500">
            {fileName}
            {summary.exportedAt ? ` · backed up ${new Date(summary.exportedAt).toLocaleString()}` : ""}
          </p>
          {total === 0 ? (
            <p>Nothing to restore — everything in this file is already in your account.</p>
          ) : (
            <p className="font-medium">This will add {total} item{total === 1 ? "" : "s"}:</p>
          )}
          <ul className="space-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">
            {rows(summary).map((k) => {
              const c = summary.counts[k];
              return (
                <li key={k}>
                  {KIND_LABELS[k]}: {c.create} to add
                  {c.skip > 0 ? `, ${c.skip} already there` : ""}
                  {c.drop > 0 ? `, ${c.drop} skipped (their parent isn't in the file)` : ""}
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={run}
              disabled={isPending || total === 0}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {isPending ? "Restoring…" : "Restore"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Restoring never deletes or overwrites anything. It runs as one step, so if
            something goes wrong nothing is changed.
          </p>
        </div>
      )}

      {done && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Restored{" "}
          {BACKUP_KINDS.reduce((sum, k) => sum + done.counts[k].create, 0)} items.
        </p>
      )}
    </div>
  );
}
