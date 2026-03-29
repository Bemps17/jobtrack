"use client";

import { CandidaturesProvider } from "@/context/candidatures-context";
import { ShellModalsProvider } from "@/context/shell-modals-context";
import { ThemeProvider } from "@/context/theme-context";
import { ToastProvider } from "@/context/toast-context";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CandidaturesProvider>
          <ShellModalsProvider>{children}</ShellModalsProvider>
        </CandidaturesProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
