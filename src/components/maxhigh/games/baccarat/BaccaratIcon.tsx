import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/** Baccarat mark — navy diamond + crimson B (not Ace High spade/amber). */
export function BaccaratIcon({ className, size = 28 }: Props) {
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
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#0c1a30" stroke="#c9a227" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="14" ry="10" fill="#122a4a" stroke="#38bdf8" strokeWidth="1.2" opacity="0.9" />
      <path d="M16 24 Q24 14 32 24 Q24 34 16 24" fill="#f43f5e" opacity="0.85" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="#f5e6c8"
        fontFamily="system-ui,sans-serif"
        fontSize="13"
        fontWeight="800"
      >
        B
      </text>
    </svg>
  );
}
