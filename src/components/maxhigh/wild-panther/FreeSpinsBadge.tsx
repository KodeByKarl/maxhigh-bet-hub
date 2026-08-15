import { WildPantherFeatureBadge } from "./WildPantherFeatureBadge";

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
    <WildPantherFeatureBadge variant="freespins" value={count} className={className} />
  );
}
