export function SearchBox({
  action,
  defaultValue,
}: {
  action: string;
  defaultValue?: string;
}) {
  return (
    <form action={action} method="GET" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search ideas…"
        className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
      >
        Search
      </button>
    </form>
  );
}
