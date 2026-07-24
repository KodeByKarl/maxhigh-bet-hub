import { createFileRoute } from "@tanstack/react-router";
import { FundInOutPanel } from "@/components/staff/FundInOutPanel";
import { saGlass } from "@/components/superadmin/ui/glass";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";

export const Route = createFileRoute("/superadmin/wallet")({
  component: SuperWalletPage,
});

function SuperWalletPage() {
  const { user, isReady } = useAuth();
  const enabled = Boolean(isReady && user && isSuperadminRole(user.role));

  return (
    <FundInOutPanel
      enabled={enabled}
      panelClass={saGlass}
      activeFilterClass="bg-amber-500 text-black"
      inactiveFilterClass="bg-white/[0.06] text-muted-foreground hover:bg-white/10 hover:text-foreground"
    />
  );
}
