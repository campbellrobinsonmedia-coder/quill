import Link from "next/link";
import { signOut } from "@/auth";
import { QuickCapture } from "@/components/quick-capture";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Quill
          </Link>
          <Link href="/dashboard" className="hidden text-neutral-500 hover:text-neutral-900 sm:inline dark:hover:text-neutral-100">
            Projects
          </Link>
          <Link href="/ideas" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Ideas
          </Link>
          <Link
            href="/search"
            aria-label="Search"
            title="Search (/)"
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm sm:gap-5">
          <Link href="/settings" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Settings
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <QuickCapture />
    </div>
  );
}
