import { MayaGoldFeatureBadge } from "./MayaGoldFeatureBadge";

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
    <MayaGoldFeatureBadge variant="freespins" value={count} className={className} />
  );
}
