import Link from "next/link";
import { signOut } from "@/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Quill
          </Link>
          <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Projects
          </Link>
          <Link href="/ideas" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            Ideas
          </Link>
        </nav>
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
      </header>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
