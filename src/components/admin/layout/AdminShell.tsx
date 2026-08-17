import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { AdminMobileNav } from "./AdminMobileNav";
import { adminGlass, adminPageBg } from "../ui/glass";

/** Domain 2 shell — casino Navbar/Sidebar are not used here. */
export function AdminShell() {
  const { user, isReady, openLogin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isReady || isLogin) return;
    if (!user) {
      openLogin();
    }
  }, [isReady, isLogin, user, openLogin]);

  if (isLogin) {
    return (
      <div className={`min-h-screen ${adminPageBg} text-foreground`}>
        <Outlet />
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={`grid min-h-screen place-items-center ${adminPageBg} text-sm text-white/50`}>
        Loading admin…
      </div>
    );
  }

  if (!user || !isStaffRole(user.role)) {
    return (
      <div className={`grid min-h-screen place-items-center ${adminPageBg} px-4`}>
        <div className={`${adminGlass} max-w-md p-8 text-center`}>
          <h1 className="text-xl font-bold text-white">Admin access required</h1>
          <p className="mt-2 text-sm text-white/55">
            Sign in with an admin account to open the dashboard.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              to="/admin/login"
              className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white"
            >
              Admin sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full max-w-[100vw] overflow-x-clip ${adminPageBg} text-foreground`}>
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />
        <main className="flex-1 p-3 pb-[5.5rem] sm:p-5 md:pb-5">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <AdminMobileNav />
    </div>
  );
}
