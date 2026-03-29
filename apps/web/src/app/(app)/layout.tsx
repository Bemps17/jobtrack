import { AppShell } from "@/components/app-shell";
import { isJobtrackDevAuthBypass } from "@/lib/dev-auth-bypass";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const bypass = isJobtrackDevAuthBypass();
  if (!bypass) {
    return <AppShell>{children}</AppShell>;
  }
  return (
    <div className="flex flex-col min-h-screen">
      <div
        role="status"
        className="py-1.5 px-3 text-center text-[11px] font-medium bg-[oklch(0.35_0.12_85)] text-[oklch(0.98_0_0)] border-b border-[oklch(0.5_0.1_85)] shrink-0"
      >
        Mode dev : authentification Clerk désactivée (
        <code className="opacity-90">JOBTRACK_DEV_BYPASS_AUTH=true</code>) — ne pas
        utiliser en production
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <AppShell>{children}</AppShell>
      </div>
    </div>
  );
}
