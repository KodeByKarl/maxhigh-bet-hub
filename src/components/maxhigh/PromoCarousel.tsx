import { Send, Coins, Trophy } from "lucide-react";

export function PromoCarousel() {
  return (
    <div className="grid grid-flow-col auto-cols-[85%] gap-4 overflow-x-auto no-scrollbar sm:auto-cols-[60%] md:grid-flow-row md:auto-cols-auto md:grid-cols-3">
      <div className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl bg-primary p-5">
        <span className="w-fit rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          Leaderboard
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Daily Race</div>
          <div className="mt-1 text-3xl font-black text-white">$5,000</div>
          <div className="mt-0.5 text-xs text-white/80">Prize pool · Ends in 12h</div>
        </div>
        <div className="absolute -bottom-4 -right-4 grid h-28 w-28 place-items-center rounded-full bg-black/20">
          <Trophy size={56} className="text-lime" />
        </div>
      </div>

      <div className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl border border-lime bg-panel p-5">
        <span className="w-fit rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0A0912]">
          Weekly
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Weekly Race</div>
          <div className="mt-1 text-3xl font-black text-foreground">$50,000</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Prize pot · 6d 04h left</div>
        </div>
        <div className="absolute -bottom-4 -right-4 grid h-28 w-28 place-items-center rounded-full bg-[#221E3A]">
          <Coins size={56} className="text-lime" />
        </div>
      </div>

      <div className="relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl bg-[#1E3A8A] p-5">
        <span className="w-fit rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          Announcement
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Telegram Drops</div>
          <div className="mt-1 text-2xl font-black text-white">Join & Claim</div>
          <div className="mt-0.5 text-xs text-white/80">Free rewards every hour</div>
        </div>
        <div className="absolute -bottom-4 -right-4 grid h-28 w-28 place-items-center rounded-full bg-black/20">
          <Send size={56} className="text-white" />
        </div>
      </div>
    </div>
  );
}
