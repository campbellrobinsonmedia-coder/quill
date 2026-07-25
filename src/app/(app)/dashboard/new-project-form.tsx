import { createProject } from "@/app/actions/projects";
import { FORMAT_TEMPLATES } from "@/lib/format-templates";

export function NewProjectForm() {
  return (
    <form action={createProject} className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="title"
          placeholder="Project title"
          required
          maxLength={200}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="formatTemplate"
          defaultValue={FORMAT_TEMPLATES[0].id}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {FORMAT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <input
        name="logline"
        placeholder="Logline (optional)"
        maxLength={1000}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
      >
        Create project
      </button>
    </form>
  );
}
