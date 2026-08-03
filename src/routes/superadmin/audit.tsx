import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy /superadmin/audit → new report routes. */
export const Route = createFileRoute("/superadmin/audit")({
  validateSearch: (search: Record<string, unknown>): { view?: string } => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.view === "staff") {
      throw redirect({ to: "/superadmin/staff" });
    }
    const allowed = ["winlose", "by-level", "by-product", "transactions", "chip-distribution"] as const;
    const view =
      search.view && (allowed as readonly string[]).includes(search.view)
        ? search.view
        : "winlose";
    throw redirect({
      to: "/superadmin/reports/$view",
      params: { view },
    });
  },
});
