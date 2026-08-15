import { Fish } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/** Compact icon for lobby / admin lists. */
export function CrabCannonIcon({ className, size = 28 }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/30 via-cyan-700/40 to-slate-900 text-teal-200",
        className,
      )}
      style={{ width: size + 12, height: size + 12 }}
    >
      <Fish style={{ width: size, height: size }} strokeWidth={2.2} />
    </span>
  );
}
