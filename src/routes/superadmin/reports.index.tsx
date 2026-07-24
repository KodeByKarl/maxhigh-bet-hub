import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/superadmin/reports/")({
  beforeLoad: () => {
    throw redirect({ to: "/superadmin/reports/$view", params: { view: "winlose" } });
  },
});
