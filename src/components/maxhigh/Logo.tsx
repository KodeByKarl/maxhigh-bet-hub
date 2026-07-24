export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/maxhigh-logo.png"
        alt="MaxHigh"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-contain"
      />
      {!compact && (
        <span className="text-[15px] font-black uppercase tracking-[0.14em] text-foreground">
          Max<span className="text-primary">High</span>
        </span>
      )}
    </div>
  );
}
