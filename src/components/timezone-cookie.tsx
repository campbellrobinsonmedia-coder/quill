"use client";

import { useEffect } from "react";

export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith("tz="))
        ?.slice(3);
      if (current !== encodeURIComponent(tz)) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      // Falls back to UTC server-side.
    }
  }, []);
  return null;
}
