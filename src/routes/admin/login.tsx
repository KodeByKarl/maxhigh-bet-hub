import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginForm } from "@/components/admin";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Admin Sign In — MaxHigh" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  return <AdminLoginForm />;
}
