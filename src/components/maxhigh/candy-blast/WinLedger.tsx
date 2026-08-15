import { memo } from "react";
import { motion } from "framer-motion";
import { CandyBlastIcon } from "./CandyBlastIcon";
import type { SymKind } from "./types";

export type LedgerRow = { id: string; kind: SymKind; count: number; pay: number };

export function mergeLedgerRows(rows: LedgerRow[]): LedgerRow[] {
  const map = new Map<SymKind, LedgerRow>();
  for (const row of rows) {
    const prev = map.get(row.kind);
    if (!prev) {
      map.set(row.kind, { ...row });
      continue;
    }
    map.set(row.kind, {
      id: row.id,
      kind: row.kind,
      count: row.count,
      pay: +(prev.pay + row.pay).toFixed(2),
    });
  }
  return [...map.values()];
}

type WinLedgerProps = {
  rows: LedgerRow[];
  /** Kept for API compatibility; tumble total is shown on the reel overlay. */
  total?: number;
};

/** Compact Bonanza-style win chip under the buy rail. Rows must already be merged. */
export const WinLedger = memo(function WinLedger({ rows }: WinLedgerProps) {
  if (rows.length === 0) {
    return (
      <div
        className="min-h-[72px] rounded-2xl border-[3px] border-white/70 shadow-lg"
        style={{
          background:
            "repeating-linear-gradient(135deg, #f472b6 0 8px, #db2777 8px 16px)",
        }}
      />
    );
  }

  return (
    <div
      className="space-y-1 rounded-2xl border-[3px] border-white/70 p-1.5 shadow-lg"
      style={{
        background: "linear-gradient(180deg, #f472b6 0%, #db2777 100%)",
      }}
    >
      {rows.map((row, idx) => (
        <motion.div
          key={row.kind}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/25 px-2 py-1"
        >
          <span className="w-5 shrink-0 text-center text-[11px] font-black text-white">
            {row.count}
          </span>
          <CandyBlastIcon kind={row.kind} className="size-6 shrink-0" />
          <span className="ml-auto truncate text-right text-[11px] font-black tabular-nums text-white">
            ₱{row.pay.toFixed(2)}
          </span>
        </motion.div>
      ))}
    </div>
  );
});
