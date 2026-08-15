import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/** Three Card Poker mark — violet diamond + gold 3. */
export function ThreeCardPokerIcon({ className, size = 28 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#12081f" stroke="#c9a227" strokeWidth="2" />
      <rect x="10" y="12" width="12" height="16" rx="2" fill="#2e1065" stroke="#a78bfa" strokeWidth="1" opacity="0.95" transform="rotate(-12 16 20)" />
      <rect x="18" y="11" width="12" height="16" rx="2" fill="#4c1d95" stroke="#c4b5fd" strokeWidth="1" />
      <rect x="26" y="12" width="12" height="16" rx="2" fill="#2e1065" stroke="#a78bfa" strokeWidth="1" opacity="0.95" transform="rotate(12 32 20)" />
      <text
        x="24"
        y="40"
        textAnchor="middle"
        fill="#f5e6c8"
        fontFamily="system-ui,sans-serif"
        fontSize="11"
        fontWeight="800"
      >
        3CP
      </text>
    </svg>
  );
}
