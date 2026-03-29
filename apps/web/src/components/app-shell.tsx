"use client";

import { ClerkAuthMenu } from "@/components/clerk-auth-menu";
import { Button } from "@/components/ui/button";
import { useCandidatures } from "@/context/candidatures-context";
import { useShellModals } from "@/context/shell-modals-context";
import { useTheme } from "@/context/theme-context";
import { APP_VERSION } from "@/lib/version";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { relanceCount, loading } = useCandidatures();
  const { openFormNew } = useShellModals();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navCls = (href: string) =>
    `nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)] transition-all text-left w-full ${
      pathname === href ? "active" : ""
    }`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--text2)]">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-x-hidden">
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col p-5 md:translate-x-0 ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="flex items-center gap-2.5 pb-6 mb-3 border-b border-[var(--border)]">
          <span className="text-[22px] text-[var(--accent)]">◈</span>
          <span className="text-base font-bold tracking-wider">JobTrack</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <Link
            href="/"
            className={navCls("/")}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-[15px] w-[18px] text-center">⬡</span>
            <span className="text-[13px]">Dashboard</span>
          </Link>
          <Link
            href="/list"
            className={navCls("/list")}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-[15px] w-[18px] text-center">⊞</span>
            <span className="text-[13px]">Candidatures</span>
          </Link>
          <Link
            href="/relances"
            className={navCls("/relances")}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-[15px] w-[18px] text-center">◷</span>
            <span className="text-[13px]">Relances</span>
            <span className="ml-auto bg-[var(--danger)] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {relanceCount}
            </span>
          </Link>
          <Link
            href="/donnees"
            className={navCls("/donnees")}
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-[15px] w-[18px] text-center">⇅</span>
            <span className="text-[13px]">Import / export</span>
          </Link>
        </nav>
        <div className="pt-3 border-t border-[var(--border)] space-y-2">
          <ClerkAuthMenu />
          <button
            type="button"
            className="nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-[var(--text2)] hover:bg-[var(--surface2)] w-full text-left"
            onClick={toggle}
          >
            <span className="text-[15px] w-[18px] text-center">
              {theme === "dark" ? "◑" : "☀"}
            </span>
            <span className="text-[13px]">
              {theme === "dark" ? "Mode sombre" : "Mode clair"}
            </span>
          </button>
          <p className="text-[10px] text-[var(--text3)] px-2">v{APP_VERSION}</p>
        </div>
      </aside>

      <button
        type="button"
        aria-label="Fermer le menu"
        className={`sidebar-overlay md:hidden ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-30 flex items-center justify-between px-4">
        <button
          type="button"
          className="burger bg-transparent border-none text-[var(--text)] text-xl p-1.5"
          aria-label="Menu"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className="text-[15px] font-bold text-[var(--accent)]">JobTrack</span>
        <Button
          type="button"
          className="px-3 py-1.5 text-xs"
          onClick={openFormNew}
        >
          + Ajouter
        </Button>
      </header>

      <main className="flex-1 md:ml-64 min-h-screen pt-16 md:pt-0 p-4 md:p-8 max-w-[1400px]">
        {children}
      </main>
    </div>
  );
}
