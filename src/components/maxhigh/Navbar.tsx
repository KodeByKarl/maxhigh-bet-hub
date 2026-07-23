import { Menu, ChevronDown, Bell, Gift, Settings, Globe, Plus, ArrowDownToLine, Wallet } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

function CoinIcon({ className }: { className?: string }) {
  // simple flat casino chip mark (solid fills only)
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#EAB308" />
      <circle cx="12" cy="12" r="6.5" fill="#0A0912" />
      <circle cx="12" cy="12" r="4" fill="#EAB308" />
    </svg>
  );
}

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-4">
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

        {/* VIP tier chip (casino vibe) */}
        <div className="ml-2 hidden items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 md:flex">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-lime text-[10px] font-black text-[#0A0912]">V</span>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Bronze</span>
          <span className="text-[10px] font-semibold text-muted-foreground">· LVL 7</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* WALLET — reworked */}
          <div className="relative">
            <div className="flex h-11 items-stretch overflow-hidden rounded-full bg-panel">
              <button
                onClick={() => setWalletOpen((v) => !v)}
                className="flex items-center gap-2 px-3 hover:bg-panel-hover"
                aria-label="Wallet"
              >
                <CoinIcon className="h-6 w-6 shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Balance</span>
                  <span className="text-sm font-black tabular-nums text-foreground">$1,284.50</span>
                </div>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              <div className="w-px bg-border" />
              <button className="flex items-center gap-1.5 bg-primary px-4 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-[#6D28D9]">
                <Plus size={16} strokeWidth={3} />
                <span className="hidden sm:inline">Deposit</span>
              </button>
            </div>

            {walletOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setWalletOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-border bg-panel p-3 shadow-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Wallet</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black tabular-nums text-foreground">$1,284.50</span>
                    <span className="rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-bold text-[#0A0912]">+2.4%</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { code: "USDT", amt: "842.10" },
                      { code: "BTC", amt: "0.0128" },
                      { code: "ETH", amt: "0.312" },
                    ].map((c) => (
                      <button key={c.code} className="flex flex-col items-start rounded-xl bg-[#221E3A] p-2 hover:bg-[#2A2640]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.code}</span>
                        <span className="mt-0.5 text-xs font-bold tabular-nums text-foreground">{c.amt}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-[#6D28D9]">
                      <Plus size={14} strokeWidth={3} /> Deposit
                    </button>
                    <button className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-transparent text-xs font-bold uppercase tracking-wider text-foreground hover:bg-panel-hover">
                      <ArrowDownToLine size={14} /> Withdraw
                    </button>
                  </div>
                  <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#221E3A] py-2 text-xs font-semibold text-foreground hover:bg-[#2A2640]">
                    <Wallet size={14} /> Transaction history
                  </button>
                </div>
              </>
            )}
          </div>

          {[Bell, Gift, Settings, Globe].map((Icon, i) => (
            <button
              key={i}
              className="relative hidden h-10 w-10 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover sm:grid"
              aria-label="menu"
            >
              <Icon size={18} />
              {i === 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
              )}
            </button>
          ))}
          <button className="grid h-10 w-10 place-items-center rounded-full bg-panel text-foreground hover:bg-panel-hover">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-black">M</div>
          </button>
        </div>
      </div>
    </header>
  );
}
