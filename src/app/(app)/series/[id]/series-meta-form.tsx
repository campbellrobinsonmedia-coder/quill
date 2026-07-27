"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSeriesMeta } from "@/app/actions/series";

const FORMAT_OPTIONS = [
  { id: "procedural", label: "Procedural (case/story of the week)" },
  { id: "serialized", label: "Serialized (season-long arc)" },
  { id: "anthology", label: "Anthology" },
  { id: "sitcom", label: "Sitcom" },
  { id: "other", label: "Other / not sure yet" },
];

export function SeriesMetaForm({
  seriesId,
  initial,
}: {
  seriesId: string;
  initial: { title: string; format: string | null; premise: string | null };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [format, setFormat] = useState(initial.format ?? "");
  const [premise, setPremise] = useState(initial.premise ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateSeriesMeta(seriesId, {
        title: title.trim() || initial.title,
        format: format || null,
        premise: premise || null,
      });
      setSaved(true);
      router.refresh();
    });
  }

  const inputClass =
    "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="space-y-1">
        <label className="text-sm font-medium">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={inputClass}>
          <option value="">Not set</option>
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Premise / franchise engine</label>
        <textarea
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          rows={3}
          className={inputClass + " resize-none"}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && !isPending && <span className="text-sm text-neutral-500">Saved</span>}
      </div>
    </form>
  );
}
