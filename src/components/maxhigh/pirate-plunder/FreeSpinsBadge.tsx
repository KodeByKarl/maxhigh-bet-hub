import { PirateFeatureBadge } from "./PirateFeatureBadge";

/** Panther-cane FREE SPINS LEFT counter. */
export function FreeSpinsBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <PirateFeatureBadge variant="freespins" value={count} className={className} />
  );
}
