import { PantherFeatureBadge } from "./PantherFeatureBadge";

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
    <PantherFeatureBadge variant="freespins" value={count} className={className} />
  );
}
