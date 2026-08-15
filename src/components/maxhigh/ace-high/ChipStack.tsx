import { cn } from "@/lib/utils";
import {
  AH_SPOT_POS,
  aceHighChipSrc,
  nearestChipValue,
  type AhBetSpot,
} from "./animationConfig";

export type SpotChip = {
  id: string;
  value: number;
};

type Props = {
  spot: AhBetSpot;
  chips: SpotChip[];
  /** Show WAR pulse marker on center spot during auto-war. */
  warActive?: boolean;
  warMatched?: number;
  className?: string;
};

/**
 * Lightweight felt stacks — CSS only (no Framer Motion) for phone FPS.
 */
export function ChipStack({ spot, chips, warActive, warMatched, className }: Props) {
  const pos = AH_SPOT_POS[spot];
  // Cap stack depth on phones to cut paint work
  const visible = chips.slice(-3);

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2",
        className,
      )}
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="relative flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
        {visible.map((c, i) => (
          <img
            key={c.id}
            src={aceHighChipSrc(c.value)}
            alt=""
            className="absolute size-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] animate-[ah-chip-in_0.22s_ease-out] sm:size-12"
            style={{
              transform: `translate(${(i % 2 === 0 ? -1 : 1) * i * 1.5}px, ${-i * 3.5}px)`,
              zIndex: i + 1,
            }}
            draggable={false}
            decoding="async"
          />
        ))}

        {warActive && spot === "tie" ? (
          <div className="absolute -bottom-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-rose-400/70 bg-rose-900/90 px-2.5 py-1 text-xs font-black tracking-widest text-rose-50 shadow-md animate-pulse sm:-bottom-6 sm:px-2 sm:py-0.5 sm:text-[9px] sm:text-rose-100">
            WAR{warMatched && warMatched > 0 ? ` ₱${warMatched.toFixed(0)}` : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Build visual chip tokens from a bet amount (largest chips first). */
export function chipsFromAmount(amount: number, prefix: string): SpotChip[] {
  if (amount <= 0) return [];
  const out: SpotChip[] = [];
  let left = Math.round(amount);
  const values = [...AH_CHIP_VALUES_REV];
  let n = 0;
  while (left > 0 && n < 8) {
    const v = values.find((x) => x <= left) ?? 1;
    out.push({ id: `${prefix}-${n}-${v}-${left}`, value: v });
    left -= v;
    n++;
  }
  if (out.length === 0 && amount > 0) {
    out.push({ id: `${prefix}-0`, value: nearestChipValue(amount) });
  }
  return out;
}

const AH_CHIP_VALUES_REV = [500, 200, 100, 25, 10, 5, 1] as const;
