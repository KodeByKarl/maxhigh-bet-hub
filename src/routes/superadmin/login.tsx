import { createFileRoute } from "@tanstack/react-router";
import { SuperLoginForm } from "@/components/superadmin/auth/SuperLoginForm";

export const Route = createFileRoute("/superadmin/login")({
  component: () => <SuperLoginForm />,
});
