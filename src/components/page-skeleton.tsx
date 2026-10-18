export function PageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-4 sm:p-6"
    >
      <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-900" />
      <div className="space-y-3 pt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
          />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
