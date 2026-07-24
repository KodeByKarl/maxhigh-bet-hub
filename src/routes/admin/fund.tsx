import { createFileRoute } from "@tanstack/react-router";
import { FundInOutPanel } from "@/components/staff/FundInOutPanel";
import { adminGlass } from "@/components/admin/ui/glass";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";

export const Route = createFileRoute("/admin/fund")({
  component: AdminFundPage,
});

function AdminFundPage() {
  const { user, isReady } = useAuth();
  const enabled = Boolean(isReady && user && isStaffRole(user.role));

  return (
    <FundInOutPanel
      enabled={enabled}
      panelClass={`${adminGlass} text-foreground`}
      activeFilterClass="bg-violet-600 text-white"
      inactiveFilterClass="bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
      refreshBtnClass="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white"
      rejectBtnClass="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-3 text-[11px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/[0.08] disabled:opacity-50"
    />
  );
}
