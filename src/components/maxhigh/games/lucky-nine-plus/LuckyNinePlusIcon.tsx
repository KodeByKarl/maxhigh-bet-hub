import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/** Lucky Nine Plus mark — jade diamond + gold 9 (distinct from Baccarat crimson B). */
export function LuckyNinePlusIcon({ className, size = 28 }: Props) {
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
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#0a1f18" stroke="#c9a227" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="14" ry="10" fill="#123d2e" stroke="#a3e635" strokeWidth="1.2" opacity="0.9" />
      <path d="M16 24 Q24 14 32 24 Q24 34 16 24" fill="#14532d" opacity="0.9" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="#f5e6c8"
        fontFamily="system-ui,sans-serif"
        fontSize="14"
        fontWeight="800"
      >
        9
      </text>
    </svg>
  );
}
