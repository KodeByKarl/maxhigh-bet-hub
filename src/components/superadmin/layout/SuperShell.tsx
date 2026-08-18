import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";
import { SuperSidebar } from "./SuperSidebar";
import { SuperTopBar } from "./SuperTopBar";
import { SuperMobileNav } from "./SuperMobileNav";
import { saGlass, saPageBg } from "../ui/glass";
import { Toaster } from "@/components/ui/sonner";

export function SuperShell() {
  const { user, isReady } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/superadmin/login";

  if (isLogin) {
    return (
      <div className={`min-h-screen ${saPageBg} text-foreground`}>
        <Outlet />
        <Toaster />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={`grid min-h-screen place-items-center ${saPageBg} text-sm text-muted-foreground`}>
        Loading superadmin…
      </div>
    );
  }

  if (!user || !isSuperadminRole(user.role)) {
    return (
      <div className={`grid min-h-screen place-items-center ${saPageBg} px-4`}>
        <div className={`${saGlass} max-w-md p-8 text-center`}>
          <h1 className="text-xl font-bold text-foreground">Superadmin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">Domain 3 requires a superadmin account.</p>
          <Link
            to="/superadmin/login"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-amber-500 px-4 text-sm font-bold text-black"
          >
            Superadmin sign in
          </Link>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full max-w-[100vw] overflow-x-clip ${saPageBg} text-foreground`}>
      <SuperSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SuperTopBar />
        <main className="flex-1 p-3 pb-[8.75rem] sm:p-5 lg:pb-5">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <SuperMobileNav />
      <Toaster />
    </div>
  );
}
