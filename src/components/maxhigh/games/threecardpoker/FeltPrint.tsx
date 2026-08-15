import { cn } from "@/lib/utils";
import type { ThreeCardPokerConfig } from "@/lib/threecardpoker-config";
import { TCP_THEME } from "./animationConfig";

const QUALIFY_WORD: Record<string, string> = {
  "10": "TEN",
  J: "JACK",
  Q: "QUEEN",
  K: "KING",
  A: "ACE",
};

/**
 * Curved house rule screen-printed across the dealer arc, as on a real layout.
 */
export function ArcRule({ qualifyRank, className }: { qualifyRank: string; className?: string }) {
  const word = QUALIFY_WORD[qualifyRank] ?? "QUEEN";
  return (
    <svg
      viewBox="0 0 400 92"
      className={cn("pointer-events-none w-full select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <path id="tcp-arc" d="M 24 84 A 176 74 0 0 1 376 84" fill="none" />
      </defs>
      <text
        fill={TCP_THEME.goldBright}
        fillOpacity="0.78"
        fontSize="16"
        fontWeight="700"
        letterSpacing="3.2"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.75))",
        }}
      >
        <textPath href="#tcp-arc" startOffset="50%" textAnchor="middle">
          DEALER PLAYS WITH {word} HIGH OR BETTER
        </textPath>
      </text>
    </svg>
  );
}

type Row = [string, string];

/** Brass-framed pit placard that hangs beside the table. */
function Plaque({ title, rows, tone }: { title: string; rows: Row[]; tone: string }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5"
      style={{
        background:
          "linear-gradient(180deg, rgba(24,20,14,0.94), rgba(8,7,5,0.94))",
        boxShadow: `0 0 0 1px ${tone}66, inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 16px rgba(0,0,0,0.55)`,
      }}
    >
      <div
        className="mb-1 border-b pb-1 text-center text-[9px] font-black uppercase leading-none"
        style={{
          color: tone,
          letterSpacing: "0.16em",
          borderColor: `${tone}33`,
          textShadow: "0 1px 1px rgba(0,0,0,0.85)",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {title}
      </div>
      <div className="space-y-[3px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 leading-none">
            <span
              className="text-[9px] font-semibold uppercase text-[#f4efe0]/80"
              style={{ letterSpacing: "0.05em" }}
            >
              {k}
            </span>
            <span
              className="text-[9px] font-black tabular-nums"
              style={{ color: tone, textShadow: "0 1px 1px rgba(0,0,0,0.7)" }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pair Plus / Ante Bonus pay tables printed on the felt, driven by live config.
 */
export function PayTables({ cfg, className }: { cfg: ThreeCardPokerConfig; className?: string }) {
  const pp: Row[] = [
    ["St. Flush", `${cfg.pairPlus.straightFlush}:1`],
    ["Trips", `${cfg.pairPlus.threeOfAKind}:1`],
    ["Straight", `${cfg.pairPlus.straight}:1`],
    ["Flush", `${cfg.pairPlus.flush}:1`],
    ["Pair", `${cfg.pairPlus.pair}:1`],
  ];
  const ab: Row[] = [
    ["St. Flush", `${cfg.anteBonus.straightFlush}:1`],
    ["Trips", `${cfg.anteBonus.threeOfAKind}:1`],
    ["Straight", `${cfg.anteBonus.straight}:1`],
  ];

  return (
    <div className={cn("flex items-start justify-between gap-2", className)}>
      <Plaque title="Pair Plus Pays" rows={pp} tone={TCP_THEME.pairPlus} />
      {cfg.anteBonusEnabled ? (
        <Plaque title="Ante Bonus" rows={ab} tone={TCP_THEME.ante} />
      ) : (
        <Plaque
          title="Ante / Play"
          rows={[
            ["Ante", `${cfg.antePayout}:1`],
            ["Play", `${cfg.playPayout}:1`],
            ["No Qualify", "Play push"],
          ]}
          tone={TCP_THEME.ante}
        />
      )}
    </div>
  );
}

/**
 * Felt surface: deep emerald nap with a moody overhead spotlight, cool rim
 * light, layered weave texture, and a heavy vignette so it reads as real cloth
 * under a pit light rather than a flat plastic panel.
 */
export function FeltSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden isolate", className)}
      style={{
        background: `radial-gradient(ellipse 85% 60% at 50% 20%, ${TCP_THEME.feltLit} 0%, ${TCP_THEME.feltFrom} 34%, ${TCP_THEME.feltMid} 66%, ${TCP_THEME.feltTo} 100%)`,
      }}
    >
      {/* fine woven nap — cross-hatch + speckle for cloth grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.55) 0 0.5px, transparent 0.5px 2px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.6) 0 0.5px, transparent 0.5px 2px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-soft-light"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.35) 0.5px, transparent 0.6px), radial-gradient(rgba(0,0,0,0.5) 0.5px, transparent 0.6px)",
          backgroundSize: "3px 3px, 3px 3px",
          backgroundPosition: "0 0, 1.5px 1.5px",
        }}
      />
      {/* worn play-arc sheen where hands are dealt */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{
          background:
            "radial-gradient(ellipse 60% 26% at 50% 82%, rgba(255,255,255,0.14), transparent 70%)",
        }}
      />
      {/* overhead pit spotlight (warm) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 42% at 50% 2%, rgba(255,244,214,0.3), rgba(255,240,200,0.08) 42%, transparent 72%)",
        }}
      />
      {/* cool rim from the pit ceiling */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% 118%, rgba(120,190,160,0.14), transparent 55%)",
        }}
      />
      {/* heavy vignette so edges fall into shadow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 95% 78% at 50% 42%, transparent 38%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.72) 100%)",
        }}
      />
      {children}
    </div>
  );
}
