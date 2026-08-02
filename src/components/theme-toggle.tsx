"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Reads DOM state set by the pre-hydration blocking script in the root
    // layout; can't be a lazy useState initializer without a server/client
    // hydration mismatch, since the class is only known client-side.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  const optionClass = (active: boolean) =>
    `flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
      active
        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
        : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
    }`;

  return (
    <div className="flex max-w-xs gap-2">
      <button
        type="button"
        onClick={() => choose("light")}
        className={optionClass(theme === "light")}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => choose("dark")}
        className={optionClass(theme === "dark")}
      >
        Dark
      </button>
    </div>
  );
}
