"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "quill:persisted-choice";

// A remembered UI choice (which view, which zoom) stored in localStorage and
// kept in step across tabs. The server and first client render use the
// fallback, so there's no hydration mismatch.
export function usePersistedChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange);
      window.addEventListener(EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(EVENT, onChange);
      };
    },
    () => {
      try {
        const stored = localStorage.getItem(key);
        return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );

  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // Storage unavailable; the choice just won't be remembered.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );

  return [value, set];
}
