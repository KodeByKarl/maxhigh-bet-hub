export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M4 18 L12 6 L20 18" />
          <path d="M12 6 L12 3" />
        </svg>
      </div>
      {!compact && (
        <span className="text-[15px] font-black uppercase tracking-[0.14em] text-foreground">
          Max<span className="text-primary">High</span>
        </span>
      )}
    </div>
  );
}
