import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/reports/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/reports/$view", params: { view: "winlose" } });
  },
  component: () => null,
});
