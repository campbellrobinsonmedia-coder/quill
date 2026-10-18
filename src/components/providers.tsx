"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast";
import { TimezoneCookie } from "@/components/timezone-cookie";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
        <TimezoneCookie />
      </ToastProvider>
    </SessionProvider>
  );
}
