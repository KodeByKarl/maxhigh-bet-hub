type MascotProps = {
  className?: string;
  size?: number;
  alt?: string;
};

/** Official MaxHigh mascot — Max the high-roller fox */
export function Mascot({ className, size = 128, alt = "Max, the MaxHigh mascot" }: MascotProps) {
  return (
    <img
      src="/maxhigh-mascot.png"
      alt={alt}
      width={size}
      height={size}
      className={`object-contain select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
