import { createFileRoute } from "@tanstack/react-router";
import { SuperShell } from "@/components/superadmin/layout/SuperShell";

export const Route = createFileRoute("/superadmin")({
  head: () => ({
    meta: [
      { title: "MaxHigh Superadmin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuperShell,
});
