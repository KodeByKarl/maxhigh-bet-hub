import { Menu, Search, Bell, Gift, Settings, Flag, Coins } from "lucide-react";
import { Logo } from "./Logo";

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-sidebar px-3 sm:px-4">
      <button
        onClick={onToggleSidebar}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="shrink-0">
        <Logo />
      </div>

      <div className="mx-2 hidden max-w-md flex-1 md:block">
        <div className="flex h-10 items-center gap-2 rounded-full bg-panel px-4 text-muted-foreground">
          <Search size={18} />
          <input
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="Search games…"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden h-10 items-center gap-2 rounded-full bg-panel px-3 sm:flex">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#EAB308] text-[#0A0912]">
            <Coins size={14} />
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">$0.0000000</span>
        </div>
        <button className="h-10 rounded-full bg-primary px-5 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:bg-[#6D28D9]">
          Deposit
        </button>
        {[Bell, Gift, Settings, Flag].map((Icon, i) => (
          <button
            key={i}
            className="hidden h-10 w-10 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover sm:grid"
            aria-label="menu"
          >
            <Icon size={18} />
          </button>
        ))}
        <button className="grid h-10 w-10 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold">M</div>
        </button>
      </div>
    </header>
  );
}
