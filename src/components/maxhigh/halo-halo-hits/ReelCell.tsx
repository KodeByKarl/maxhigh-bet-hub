import { cn } from "@/lib/utils";
import type { FoSymKind } from "@/lib/halo-halo-hits-config";
import { HaloHaloHitsIcon } from "./HaloHaloHitsIcon";

export type ReelPhase = "idle" | "spinning" | "stopping" | "win";

const SPIN_STRIP: FoSymKind[] = [
  "ruby",
  "emerald",
  "sapphire",
  "amethyst",
  "topaz",
  "temple",
  "wild",
];

type ReelCellProps = {
  kind: FoSymKind;
  phase: ReelPhase;
  reel: number;
  row: number;
  spinId: number;
  winning?: boolean;
  fading?: boolean;
  dimmed?: boolean;
  className?: string;
};

export function ReelCell({
  kind,
  phase,
  reel,
  row,
  spinId,
  winning,
  fading,
  dimmed,
  className,
}: ReelCellProps) {
  const spinning = phase === "spinning";
  const activeGlow = !!winning && !fading;
  const showRing = !!winning || !!fading;
  const strip = [...SPIN_STRIP, ...SPIN_STRIP];
  const framePct = 100 / strip.length;
  const stopDelayMs = reel * 90 + row * 30;

  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden",
        // Warm temple wood plate under framed gems
        "bg-gradient-to-b from-[#24140e] to-[#0e0806]",
        "transition-[opacity,box-shadow,filter] duration-350 ease-out",
        dimmed && !activeGlow && !fading && "opacity-40",
        activeGlow && "z-10 brightness-110",
        className,
      )}
    >
      {showRing ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[5] ring-[3px] ring-inset ring-yellow-300",
            "transition-opacity duration-350 ease-out",
            fading ? "opacity-0" : "opacity-100",
            "shadow-[inset_0_0_24px_rgba(250,204,21,0.55)]",
          )}
        />
      ) : null}

      {spinning ? (
        <div
          className="fg-reel-scroll absolute left-0 top-0 z-[1] w-full"
          style={{
            height: `${strip.length * 100}%`,
            filter: "blur(2px) saturate(1.12) brightness(1.08)",
            animationDuration: `${0.18 + (reel % 3) * 0.03}s`,
          }}
        >
          {strip.map((sym, i) => (
            <div
              key={`${spinId}-spin-${i}`}
              className="relative w-full"
              style={{ height: `${framePct}%` }}
            >
              <HaloHaloHitsIcon kind={sym} />
            </div>
          ))}
        </div>
      ) : (
        <div
          key={`land-${spinId}-${reel}-${row}`}
          className={cn(
            "absolute inset-0 z-[1] transition-[transform,filter] duration-350 ease-out",
            phase === "stopping" && "fg-reel-land",
            activeGlow && "fg-win-pulse",
          )}
          style={phase === "stopping" ? { animationDelay: `${stopDelayMs}ms` } : undefined}
        >
          <HaloHaloHitsIcon kind={kind} />
        </div>
      )}

      {spinning ? (
        <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.4)_100%)]" />
      ) : null}
    </div>
  );
}
