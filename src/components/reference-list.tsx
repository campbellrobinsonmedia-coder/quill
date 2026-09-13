"use client";

import { useRef, useState, useTransition } from "react";
import {
  createLinkReference,
  createFileReference,
  deleteReference,
  type ReferenceScope,
} from "@/app/actions/references";

export type ReferenceData = {
  id: string;
  kind: "LINK" | "FILE";
  url: string;
  label: string;
  note: string | null;
  fileType: string | null;
};

function iconFor(ref: ReferenceData): string {
  if (ref.kind === "LINK") return "🔗";
  if (ref.fileType?.startsWith("image/")) return "🖼️";
  if (ref.fileType?.startsWith("audio/")) return "🎵";
  if (ref.fileType?.startsWith("video/")) return "🎬";
  return "📎";
}

export function ReferenceList({
  scope,
  initialReferences,
}: {
  scope: ReferenceScope;
  initialReferences: ReferenceData[];
}) {
  const [references, setReferences] = useState(initialReferences);
  const [prevInitial, setPrevInitial] = useState(initialReferences);
  if (initialReferences !== prevInitial) {
    setPrevInitial(initialReferences);
    setReferences(initialReferences);
  }
  const [mode, setMode] = useState<"closed" | "link" | "file">("closed");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setMode("closed");
    setUrl("");
    setLabel("");
    setNote("");
    setError(null);
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await createLinkReference(scope, { url, label, note: note || undefined });
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't add that link");
      }
    });
  }

  function submitFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createFileReference(scope, formData);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't upload that file");
      }
    });
  }

  return (
    <div className="space-y-2">
      {references.length > 0 && (
        <ul className="space-y-1">
          {references.map((ref) => (
            <li key={ref.id} className="flex items-start justify-between gap-2 text-xs">
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-start gap-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                <span className="shrink-0">{iconFor(ref)}</span>
                <span className="min-w-0">
                  <span className="block truncate">{ref.label}</span>
                  {ref.note && (
                    <span className="block truncate text-neutral-400">{ref.note}</span>
                  )}
                </span>
              </a>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await deleteReference(ref.id);
                  })
                }
                className="shrink-0 text-neutral-300 hover:text-red-600 dark:text-neutral-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === "closed" && (
        <div className="flex gap-3 text-xs">
          <button
            onClick={() => setMode("link")}
            className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            + Add link
          </button>
          <button
            onClick={() => setMode("file")}
            className="text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            + Add file
          </button>
        </div>
      )}

      {mode === "link" && (
        <form onSubmit={submitLink} className="space-y-1.5 rounded border border-neutral-200 p-2 dark:border-neutral-800">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={reset} className="text-xs text-neutral-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !url.trim()}
              className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {isPending ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {mode === "file" && (
        <form onSubmit={submitFile} className="space-y-1.5 rounded border border-neutral-200 p-2 dark:border-neutral-800">
          <input
            ref={fileInputRef}
            name="file"
            type="file"
            className="w-full text-xs"
          />
          <input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full rounded border border-neutral-300 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <p className="text-neutral-400">Images, audio, video, or PDF — up to 20MB.</p>
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={reset} className="text-xs text-neutral-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
            >
              {isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
