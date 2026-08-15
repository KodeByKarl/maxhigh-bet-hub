import { AztecFeatureBadge } from "./AztecFeatureBadge";

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
    <AztecFeatureBadge variant="freespins" value={count} className={className} />
  );
}
