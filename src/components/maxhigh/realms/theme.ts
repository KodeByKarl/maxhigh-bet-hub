/**
 * Realms visual theme — derives the full CSS-variable palette and asset paths
 * from a title's four catalog colors, so no title needs a hand-written theme.
 */
import type { CSSProperties } from "react";
import type { PantherThemeColors } from "@/components/maxhigh/panther-shared/theme";
import { colorsToCssVars } from "@/components/maxhigh/panther-shared/theme";
import type { RealmsGameDef } from "@/lib/realms";
import type { RealmsSymKind } from "@/lib/realms/schema";

/** Bump when regenerated art should bypass browser caches. */
const ART_VERSION = "1";

export type RealmsAssets = {
  backdrop: string;
  loadingBg: string;
  icons: Record<RealmsSymKind, string>;
};

export type RealmsTheme = {
  id: string;
  name: string;
  assets: RealmsAssets;
  colors: PantherThemeColors;
};

function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function realmsAssetBase(id: string) {
  return `/images/symbols/realms/${id}`;
}

export function realmsAssets(id: string): RealmsAssets {
  const base = realmsAssetBase(id);
  const v = `?v=${ART_VERSION}`;
  const kinds: RealmsSymKind[] = [
    "l1",
    "l2",
    "l3",
    "l4",
    "l5",
    "p1",
    "p2",
    "p3",
    "scatter",
    "bomb",
  ];
  return {
    backdrop: `${base}/backdrop.webp${v}`,
    loadingBg: `${base}/loading-bg.webp${v}`,
    icons: Object.fromEntries(kinds.map((k) => [k, `${base}/${k}.webp${v}`])) as Record<
      RealmsSymKind,
      string
    >,
  };
}

export function realmsColors(def: RealmsGameDef): PantherThemeColors {
  const [primary, secondary, glow, deep] = def.palette;
  return {
    accent: primary,
    accentSoft: glow,
    accentDeep: deep,
    rim: rgba(primary, 0.55),
    wellFillTop: rgba(deep, 0.55),
    wellFillBottom: rgba(deep, 0.8),
    topGlow: rgba(primary, 0.2),
    divider: rgba(glow, 0.65),
    spinFrom: glow,
    spinMid: primary,
    spinTo: secondary,
    spinShadow: rgba(primary, 0.55),
    hudBorder: rgba(primary, 0.4),
    hudLabel: rgba(glow, 0.75),
    hudValue: "#FFFFFF",
    winBorder: rgba(glow, 0.5),
    winFrom: rgba(secondary, 0.92),
    winTo: "rgba(0,0,0,0.85)",
    winLabel: rgba(glow, 0.85),
    winValue: glow,
    tumbleFrom: primary,
    tumbleTo: secondary,
    tumbleBorder: glow,
    tumbleText: "#FFFFFF",
    modalFrom: glow,
    modalMid: primary,
    modalTo: secondary,
    modalBorder: rgba(primary, 0.45),
    modalTitle: glow,
    menuFrom: secondary,
    menuTo: deep,
    menuAccent: glow,
    winRing: rgba(glow, 0.35),
    bombBadgeBorder: glow,
    bombBadgeFrom: secondary,
    bombBadgeTo: deep,
    bombBadgeText: "#FFFFFF",
    scatterBadgeFrom: secondary,
    scatterBadgeTo: primary,
    payoutPillFrom: "#FFFFFF",
    payoutPillTo: glow,
    payoutPillText: deep,
    muteBorder: rgba(primary, 0.4),
    muteText: glow,
  };
}

export function realmsTheme(def: RealmsGameDef): RealmsTheme {
  return { id: def.id, name: def.name, assets: realmsAssets(def.id), colors: realmsColors(def) };
}

export function realmsCssVars(theme: RealmsTheme): CSSProperties {
  return colorsToCssVars(theme.colors);
}
