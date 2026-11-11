import type { ReactNode } from "react";

/** One fluted marble column: gold capital, fluted shaft, plinth. Pure decoration. */
function Pillar({ side }: { side: "l" | "r" }) {
  return (
    <div className={`zs-pillar zs-pillar--${side}`} aria-hidden="true">
      <i className="zs-pillar__cap" />
      <i className="zs-pillar__shaft" />
      <i className="zs-pillar__base" />
    </div>
  );
}

/** Thunderbolt glyph shared by the pediment crest and the Spin altar. */
export const BOLT_PATH = "M30 1 L7 36 H22 L15 63 L43 24 H27 Z";

/**
 * Temple of Zeus — presentation only. Pediment gable with a crest bolt, two marble pillars flanking the reel chamber, and a
 * stepped stylobate. The reels (children) sit untouched in the chamber.
 */
export function TempleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="zs-temple">
      <div className="zs-pediment" aria-hidden="true">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="zs-pediment__gable">
          <defs>
            <linearGradient id="zs-ped-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff1b8" />
              <stop offset=".5" stopColor="#d3a43a" />
              <stop offset="1" stopColor="#6d4a12" />
            </linearGradient>
            <linearGradient id="zs-bolt-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".35" stopColor="#ffe27a" />
              <stop offset="1" stopColor="#c8891c" />
            </linearGradient>
            <linearGradient id="zs-ped-stone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a4a6c" />
              <stop offset="1" stopColor="#141c33" />
            </linearGradient>
          </defs>
          <polygon points="0,24 50,0 100,24" fill="url(#zs-ped-gold)" />
          <polygon points="4.5,23 50,2.6 95.5,23" fill="url(#zs-ped-stone)" />
        </svg>
        <span className="zs-pediment__crest">
          <svg viewBox="0 0 48 64" width="100%" height="100%">
            <path d={BOLT_PATH} className="zs-bolt-fill" />
          </svg>
        </span>
        <span className="zs-pediment__title">Zeus Strike</span>
      </div>
      <div className="zs-hall">
        <Pillar side="l" />
        <div className="zs-chamber">{children}</div>
        <Pillar side="r" />
      </div>
      <div className="zs-stylobate" aria-hidden="true">
        <i />
        <i />
      </div>
    </div>
  );
}
