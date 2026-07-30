import { createFileRoute, redirect } from "@tanstack/react-router";
import { isReportSection } from "@/components/superadmin/reports/ReportNav";
import { ReportSectionPage } from "@/components/superadmin/reports/ReportSectionPage";
import { useAuth } from "@/lib/auth";
import { isStaffRole } from "@/lib/user";

export const Route = createFileRoute("/admin/reports/$view")({
  beforeLoad: ({ params }) => {
    if (!isReportSection(params.view)) {
      throw redirect({ to: "/admin/reports/$view", params: { view: "winlose" } });
    }
  },
  component: AdminReportViewPage,
});

function AdminReportViewPage() {
  const { view } = Route.useParams();
  const { user, isReady } = useAuth();
  const enabled = Boolean(isReady && user && isStaffRole(user.role));

  if (!isReportSection(view)) {
    return null;
  }

  return <ReportSectionPage view={view} enabled={enabled} prefix="/admin" />;
}
