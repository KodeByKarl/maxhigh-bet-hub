import { createFileRoute, redirect } from "@tanstack/react-router";
import { isReportSection } from "@/components/superadmin/reports/ReportNav";
import { ReportSectionPage } from "@/components/superadmin/reports/ReportSectionPage";
import { useAuth } from "@/lib/auth";
import { isSuperadminRole } from "@/lib/user";

export const Route = createFileRoute("/superadmin/reports/$view")({
  beforeLoad: ({ params }) => {
    if (!isReportSection(params.view)) {
      throw redirect({ to: "/superadmin/reports/$view", params: { view: "winlose" } });
    }
  },
  component: SuperReportViewPage,
});

function SuperReportViewPage() {
  const { view } = Route.useParams();
  const { user, isReady } = useAuth();
  const enabled = Boolean(isReady && user && isSuperadminRole(user.role));

  if (!isReportSection(view)) {
    return null;
  }

  return <ReportSectionPage view={view} enabled={enabled} />;
}
