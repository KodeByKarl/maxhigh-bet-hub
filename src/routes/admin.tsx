import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "MaxHigh Admin" },
      { name: "description", content: "MaxHigh admin dashboard — manage users and platform stats." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  return (
    <>
      <AdminShell />
      <Toaster />
    </>
  );
}
