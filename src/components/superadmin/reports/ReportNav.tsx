import { Link } from "@tanstack/react-router";
import { saGlass } from "@/components/superadmin/ui/glass";

export const REPORT_SECTIONS = [
  { slug: "winlose", label: "Win/Lose" },
  { slug: "by-level", label: "Win/Lose By Level" },
  { slug: "by-product", label: "Win/Lose By Product" },
  { slug: "transactions", label: "Transaction History" },
  { slug: "outstanding", label: "Outstanding" },
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number]["slug"];

export function isReportSection(v: string): v is ReportSection {
  return REPORT_SECTIONS.some((s) => s.slug === v);
}

export function ReportSubnav({ active }: { active: ReportSection }) {
  return (
    <div className={`${saGlass} flex flex-wrap gap-1.5 p-2`}>
      {REPORT_SECTIONS.map((s) => {
        const on = s.slug === active;
        return (
          <Link
            key={s.slug}
            to="/superadmin/reports/$view"
            params={{ view: s.slug }}
            className={[
              "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              on
                ? "bg-amber-500 text-black"
                : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
            ].join(" ")}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ReportPageHeader({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
    </div>
  );
}
