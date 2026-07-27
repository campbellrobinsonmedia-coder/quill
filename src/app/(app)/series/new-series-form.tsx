import { createSeries } from "@/app/actions/series";

const FORMAT_OPTIONS = [
  { id: "procedural", label: "Procedural (case/story of the week)" },
  { id: "serialized", label: "Serialized (season-long arc)" },
  { id: "anthology", label: "Anthology" },
  { id: "sitcom", label: "Sitcom" },
  { id: "other", label: "Other / not sure yet" },
];

export function NewSeriesForm() {
  return (
    <form
      action={createSeries}
      className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="title"
          placeholder="Series title"
          required
          maxLength={200}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="format"
          defaultValue=""
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Format (optional)</option>
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="premise"
        placeholder="Premise / franchise engine (optional) — the repeatable idea that generates episodes"
        rows={2}
        maxLength={2000}
        className="w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Create series
      </button>
    </form>
  );
}
