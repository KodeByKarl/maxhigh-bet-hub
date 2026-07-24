import { CandyFeatureBadge } from "./CandyFeatureBadge";

/** Candy-cane FREE SPINS LEFT counter. */
export function FreeSpinsBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <CandyFeatureBadge variant="freespins" value={count} className={className} />
  );
}
