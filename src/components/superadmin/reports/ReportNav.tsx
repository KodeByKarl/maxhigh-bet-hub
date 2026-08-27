import { Link } from "@tanstack/react-router";
import { saGlass } from "@/components/superadmin/ui/glass";
import { Printer } from "lucide-react";
import { formatDateTimePH } from "@/lib/datetime";

export const REPORT_SECTIONS = [
  { slug: "winlose", label: "Win/Lose" },
  { slug: "by-level", label: "Win/Lose By Level" },
  { slug: "by-product", label: "Win/Lose By Product" },
  { slug: "transactions", label: "Transaction History" },
  { slug: "chip-distribution", label: "Chip Distribution Log" },
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number]["slug"];

export function isReportSection(v: string): v is ReportSection {
  return REPORT_SECTIONS.some((s) => s.slug === v);
}

export function ReportSubnav({ active, prefix = "/superadmin" }: { active: ReportSection; prefix?: "/superadmin" | "/admin" }) {
  return (
    <div className={`${saGlass} flex flex-wrap gap-1.5 p-2`}>
      {REPORT_SECTIONS.map((s) => {
        const on = s.slug === active;
        const toPath = (prefix === "/admin" ? "/admin/reports/$view" : "/superadmin/reports/$view") as any;
        return (
          <Link
            key={s.slug}
            to={toPath}
            params={{ view: s.slug }}
            className={[
              "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              on
                ? "bg-amber-500 text-black font-bold"
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
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{blurb}</p>
      </div>

      <button
        type="button"
        onClick={handlePrint}
        className="no-print flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-300 hover:bg-amber-500/20 transition sm:px-4 sm:text-xs"
      >
        <Printer className="h-4 w-4 text-amber-400" />
        Export / Print PDF
      </button>

      <div className="hidden print-only text-xs text-black pb-2 border-b border-black w-full mb-4">
        <div className="font-bold text-lg">MaxHigh Platform Report — {title}</div>
        <div>Generated on: {formatDateTimePH(new Date())}</div>
      </div>
    </div>
  );
}
