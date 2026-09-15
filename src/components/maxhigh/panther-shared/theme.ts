import type { CSSProperties } from "react";

/** Same symbol keys as panther-family engines (math ids — not display names). */
export type PantherSymKind =
  | "grape"
  | "plum"
  | "melon"
  | "apple"
  | "blue"
  | "green"
  | "purple"
  | "heart"
  | "lollipop"
  | "bomb";

/** Visual skin for Golden Panther family — math engines stay shared/identical. */
export type PantherThemeAssets = {
  backdrop: string;
  loadingBg: string;
  icons: Record<PantherSymKind, string>;
};

export type PantherThemeColors = {
  accent: string;
  accentSoft: string;
  accentDeep: string;
  rim: string;
  wellFillTop: string;
  wellFillBottom: string;
  topGlow: string;
  divider: string;
  spinFrom: string;
  spinMid: string;
  spinTo: string;
  spinShadow: string;
  hudBorder: string;
  hudLabel: string;
  hudValue: string;
  winBorder: string;
  winFrom: string;
  winTo: string;
  winLabel: string;
  winValue: string;
  tumbleFrom: string;
  tumbleTo: string;
  tumbleBorder: string;
  tumbleText: string;
  modalFrom: string;
  modalMid: string;
  modalTo: string;
  modalBorder: string;
  modalTitle: string;
  menuFrom: string;
  menuTo: string;
  menuAccent: string;
  winRing: string;
  bombBadgeBorder: string;
  bombBadgeFrom: string;
  bombBadgeTo: string;
  bombBadgeText: string;
  scatterBadgeFrom: string;
  scatterBadgeTo: string;
  payoutPillFrom: string;
  payoutPillTo: string;
  payoutPillText: string;
  muteBorder: string;
  muteText: string;
};

export type PantherTheme = {
  id: string;
  name: string;
  assets: PantherThemeAssets;
  colors: PantherThemeColors;
};

const VAR_MAP: Record<keyof PantherThemeColors, string> = {
  accent: "--p-accent",
  accentSoft: "--p-accent-soft",
  accentDeep: "--p-accent-deep",
  rim: "--p-rim",
  wellFillTop: "--p-well-top",
  wellFillBottom: "--p-well-bottom",
  topGlow: "--p-top-glow",
  divider: "--p-divider",
  spinFrom: "--p-spin-from",
  spinMid: "--p-spin-mid",
  spinTo: "--p-spin-to",
  spinShadow: "--p-spin-shadow",
  hudBorder: "--p-hud-border",
  hudLabel: "--p-hud-label",
  hudValue: "--p-hud-value",
  winBorder: "--p-win-border",
  winFrom: "--p-win-from",
  winTo: "--p-win-to",
  winLabel: "--p-win-label",
  winValue: "--p-win-value",
  tumbleFrom: "--p-tumble-from",
  tumbleTo: "--p-tumble-to",
  tumbleBorder: "--p-tumble-border",
  tumbleText: "--p-tumble-text",
  modalFrom: "--p-modal-from",
  modalMid: "--p-modal-mid",
  modalTo: "--p-modal-to",
  modalBorder: "--p-modal-border",
  modalTitle: "--p-modal-title",
  menuFrom: "--p-menu-from",
  menuTo: "--p-menu-to",
  menuAccent: "--p-menu-accent",
  winRing: "--p-win-ring",
  bombBadgeBorder: "--p-bomb-border",
  bombBadgeFrom: "--p-bomb-from",
  bombBadgeTo: "--p-bomb-to",
  bombBadgeText: "--p-bomb-text",
  scatterBadgeFrom: "--p-scatter-from",
  scatterBadgeTo: "--p-scatter-to",
  payoutPillFrom: "--p-payout-from",
  payoutPillTo: "--p-payout-to",
  payoutPillText: "--p-payout-text",
  muteBorder: "--p-mute-border",
  muteText: "--p-mute-text",
};

export function themeToCssVars(theme: PantherTheme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(VAR_MAP) as [keyof PantherThemeColors, string][]) {
    vars[cssVar] = theme.colors[key];
  }
  return vars as CSSProperties;
}

/** Shared GP symbol pack (math SymKinds map to these files). */
export function gpIconPack(version = "1"): Record<PantherSymKind, string> {
  const v = `?v=${version}`;
  return {
    grape: `/images/symbols/gp/10.png${v}`,
    plum: `/images/symbols/gp/J.png${v}`,
    melon: `/images/symbols/gp/Q.png${v}`,
    apple: `/images/symbols/gp/K.webp${v}`,
    blue: `/images/symbols/gp/A.png${v}`,
    green: `/images/symbols/gp/owl.png${v}`,
    purple: `/images/symbols/gp/wolf.png${v}`,
    heart: `/images/symbols/gp/ram.png${v}`,
    lollipop: `/images/symbols/gp/scatter.webp${v}`,
    bomb: `/images/symbols/gp/wild.webp${v}`,
  };
}

export function themedIconPack(gameId: string, version = "1"): Record<PantherSymKind, string> {
  const base = `/images/symbols/${gameId}`;
  const v = `?v=${version}`;
  return {
    grape: `${base}/10.png${v}`,
    plum: `${base}/J.png${v}`,
    melon: `${base}/Q.png${v}`,
    apple: `${base}/K.png${v}`,
    blue: `${base}/A.png${v}`,
    green: `${base}/premium-a.png${v}`,
    purple: `${base}/premium-b.png${v}`,
    heart: `${base}/premium-c.png${v}`,
    lollipop: `${base}/scatter.png${v}`,
    bomb: `${base}/wild.png${v}`,
  };
}
