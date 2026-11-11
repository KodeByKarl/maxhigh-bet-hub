/**
 * Decorative Gothic Citadel ornaments for the Ruby Raven reel well: ruby crystal corner pieces, a raven-wing crest and hairline volcanic
 * cracks. Pure SVG, pointer-events none, no gameplay state.
 */
function RubyCorner({ className }: { className: string }) {
  return (
    <svg className={`rr-corner ${className}`} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="rr-cs" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4e7ee" />
          <stop offset="0.55" stopColor="#7d828e" />
          <stop offset="1" stopColor="#2e3038" />
        </linearGradient>
      </defs>
      {/* silver claw bracket */}
      <path
        d="M2 38 L2 12 C2 6 6 2 12 2 L38 2 L38 8 L14 8 C10.5 8 8 10.5 8 14 L8 38 Z"
        fill="url(#rr-cs)"
        stroke="#0b0b0f"
        strokeWidth="1"
      />
      <path d="M12 12 L30 12 M12 12 L12 30" stroke="#0b0b0f" strokeOpacity="0.55" strokeWidth="1" />
      {/* ruby crystal */}
      <polygon points="17,11 26,15 28,24 21,30 13,25 12,17" fill="#0b0b0f" />
      <polygon points="18,13 25,16 26,23 21,28 15,24 14,18" fill="#c8153a" />
      <polygon points="18,13 25,16 20,21" fill="#ff8196" />
      <polygon points="25,16 26,23 20,21" fill="#e11d48" />
      <polygon points="20,21 21,28 15,24" fill="#7a0d26" />
    </svg>
  );
}

export function RavenFrame() {
  return (
    <>
      <i className="rr-well__cracks" aria-hidden="true" />
      <RubyCorner className="rr-corner--tl" />
      <RubyCorner className="rr-corner--tr" />
      <RubyCorner className="rr-corner--bl" />
      <RubyCorner className="rr-corner--br" />
      <svg className="rr-crest" viewBox="0 0 160 30" aria-hidden="true">
        <defs>
          <linearGradient id="rr-cw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#40434d" />
            <stop offset="1" stopColor="#09090c" />
          </linearGradient>
          <linearGradient id="rr-cr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8196" />
            <stop offset="1" stopColor="#a00f2c" />
          </linearGradient>
        </defs>
        {[false, true].map((m) => (
          <g key={String(m)} transform={m ? "translate(160 0) scale(-1 1)" : undefined}>
            <path
              d="M74 16 C58 6 32 4 4 10 L14 14 L5 19 L22 20 L16 25 L36 24 L34 29 L54 24 L68 22 Z"
              fill="url(#rr-cw)"
              stroke="#aeb3bf"
              strokeWidth="1"
              strokeLinejoin="round"
            />
            <path
              d="M66 16 C50 11 32 11 16 14 M62 20 C46 17 32 17 22 19"
              fill="none"
              stroke="#c9ced8"
              strokeOpacity="0.35"
            />
          </g>
        ))}
        <polygon points="80,4 90,14 80,26 70,14" fill="#0b0b0f" stroke="#aeb3bf" strokeWidth="1" />
        <polygon points="80,8 87,14 80,22 73,14" fill="url(#rr-cr)" />
        <polygon points="80,8 87,14 80,15" fill="#ffc2cc" opacity="0.7" />
      </svg>
    </>
  );
}
