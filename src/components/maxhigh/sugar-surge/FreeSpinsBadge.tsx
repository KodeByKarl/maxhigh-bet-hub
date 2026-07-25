import { SugarFeatureBadge } from "./SugarFeatureBadge";

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
    <SugarFeatureBadge variant="freespins" value={count} className={className} />
  );
}
