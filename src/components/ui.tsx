import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-neutral-900",
  secondary:
    "border border-neutral-300 px-4 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900",
  ghost:
    "px-3 py-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${extra}`.trim();
}

export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium text-neutral-500">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
      <p className="text-sm text-neutral-500">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={buttonClass("secondary", "mt-3")}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
