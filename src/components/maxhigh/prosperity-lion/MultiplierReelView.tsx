import { cn } from "@/lib/utils";
import { CARD_FRAME_SRC } from "./animationConfig";

type MultiplierReelProps = {
  /** [top, center, bottom] faces */
  faces: [number, number, number];
  spinning: boolean;
  highlight?: boolean;
  fading?: boolean;
  spinId: number;
  className?: string;
};

const DISPLAY_STRIP = [1, 2, 3, 5, 10, 15, 1, 2, 3, 5, 10, 15];

function multTone(v: number) {
  if (v >= 15) return "from-rose-300 via-amber-200 to-yellow-400 text-rose-950";
  if (v >= 10) return "from-amber-200 via-yellow-300 to-amber-500 text-amber-950";
  if (v >= 5) return "from-yellow-200 via-amber-300 to-orange-400 text-amber-950";
  if (v >= 3) return "from-amber-100 via-yellow-200 to-amber-400 text-amber-900";
  return "from-stone-100 via-amber-100 to-amber-300 text-stone-800";
}

function MultBadge({
  value,
  large,
  dimmed,
  pulse,
}: {
  value: number;
  large?: boolean;
  dimmed?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full border-2",
        "bg-gradient-to-b shadow-[0_3px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]",
        large ? "border-amber-200 size-[70%] max-h-[4.5rem] max-w-[4.5rem]" : "border-amber-400/70 size-[52%] max-h-11 max-w-11",
        multTone(value),
        dimmed && "opacity-35 scale-[0.92]",
        pulse && "fg-win-pulse",
      )}
    >
      <div className="pointer-events-none absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.4),transparent_55%)]" />
      <span
        className={cn(
          "relative z-[1] font-black tabular-nums tracking-tight",
          large ? "text-xl sm:text-2xl" : "text-xs sm:text-sm",
        )}
      >
        {value}×
      </span>
    </div>
  );
}

/**
 * Multiplier reel — same gold chrome language as the 3×3 gem grid.
 */
export function MultiplierReelView({
  faces,
  spinning,
  highlight,
  fading,
  spinId,
  className,
}: MultiplierReelProps) {
  const center = faces[1] ?? 1;
  const framePct = 100 / DISPLAY_STRIP.length;

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[0.85rem] p-[3px] sm:rounded-[1.15rem] sm:p-1",
        "shadow-[0_12px_36px_rgba(180,83,9,0.45)]",
        highlight && !fading && "ring-2 ring-yellow-300",
        className,
      )}
      style={{
        background: "linear-gradient(145deg,#fbbf24 0%,#b45309 40%,#7c2d12 100%)",
      }}
    >
      {/* Inner plate — matches gem cells */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[0.55rem] sm:rounded-[0.75rem]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, #3a1a12 0%, #1a0c0a 55%, #0a0608 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(251,191,36,0.16) 0%, transparent 60%)",
          }}
        />

        {/* Same ornate card-frame as gem tiles */}
        <img
          src={`${CARD_FRAME_SRC}?v=frame3`}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 z-[6] size-full object-fill"
        />

        {/* MULT label */}
        <div className="relative z-[5] shrink-0 px-2 pt-2.5">
          <p className="text-center text-[8px] font-black uppercase tracking-[0.28em] text-amber-200/90 sm:text-[9px]">
            Mult
          </p>
        </div>

        {/* Faces */}
        <div className="relative z-[3] mx-[12%] mb-1 min-h-0 flex-1 overflow-hidden">
          {spinning ? (
            <div
              className="fg-reel-scroll absolute left-0 top-0 z-[1] w-full"
              style={{
                height: `${DISPLAY_STRIP.length * 100}%`,
                filter: "blur(1.2px) saturate(1.12)",
                animationDuration: "0.2s",
              }}
            >
              {DISPLAY_STRIP.map((v, i) => (
                <div
                  key={`${spinId}-m-${i}`}
                  className="grid place-items-center"
                  style={{ height: `${framePct}%` }}
                >
                  <MultBadge value={v} />
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 grid grid-rows-3">
              {faces.map((v, i) => {
                const isCenter = i === 1;
                return (
                  <div
                    key={`${spinId}-face-${i}`}
                    className={cn(
                      "relative grid place-items-center",
                      isCenter && "bg-gradient-to-b from-amber-400/15 to-transparent",
                    )}
                  >
                    <MultBadge
                      value={v}
                      large={isCenter}
                      dimmed={!isCenter}
                      pulse={highlight && isCenter && !fading}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {!spinning && (
            <div className="pointer-events-none absolute inset-x-[-4%] top-1/2 z-[2] h-[33%] -translate-y-1/2 rounded-md border-y border-amber-300/60" />
          )}
        </div>

        {/* Active readout */}
        <div className="relative z-[5] shrink-0 px-2 pb-2.5">
          <div
            className={cn(
              "mx-auto rounded-md border border-amber-400/50 bg-gradient-to-b from-amber-700/35 to-black/50 px-1 py-0.5 text-center",
              highlight && !fading && "fg-win-pulse",
            )}
          >
            <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-amber-300/75">
              Active
            </p>
            <p className="text-sm font-black tabular-nums text-amber-50">{center}×</p>
          </div>
        </div>
      </div>
    </div>
  );
}
