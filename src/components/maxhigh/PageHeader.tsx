import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, description, icon: Icon, accent = "#7C3AED" }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-panel p-5">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: accent }}>
        <Icon size={26} className="text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-black uppercase tracking-wide text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="grid min-h-[300px] place-items-center rounded-2xl border border-border bg-panel p-8 text-center">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-lime">Coming soon</div>
        <div className="mt-2 text-xl font-black text-foreground">{label}</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          This section is being built. Check back soon for a full experience.
        </p>
      </div>
    </div>
  );
}
