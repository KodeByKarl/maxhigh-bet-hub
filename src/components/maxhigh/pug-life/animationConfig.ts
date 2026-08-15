/** Pug Den UI timing / labels / art paths (non-authoritative). */

import type { PlSymKind } from "@/lib/pug-life-config";

export const ANIM = {
  spinMs: 1100,
  reelStagger: 110,
  landMs: 380,
  winHold: 1200,
  winFade: 280,
  bonusStepMs: 700,
  turboFactor: 0.35,
};

export const BET_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];

export const SYM_LABEL: Record<PlSymKind, string> = {
  sym_10: "10",
  sym_j: "J",
  sym_q: "Q",
  sym_k: "K",
  sym_a: "A",
  rat: "RAT",
  pigeon: "PIG",
  cat: "CAT",
  chihuahua: "CHI",
  pug: "PUG",
  treat_biscuit: "🍪",
  treat_bone: "🦴",
  treat_steak: "🥩",
  scatter: "DEN",
  toaster: "🍞",
};

export const SYM_COLOR: Record<PlSymKind, string> = {
  sym_10: "#94A3B8",
  sym_j: "#94A3B8",
  sym_q: "#94A3B8",
  sym_k: "#CBD5E1",
  sym_a: "#E2E8F0",
  rat: "#A78BFA",
  pigeon: "#67E8F9",
  cat: "#FBBF24",
  chihuahua: "#FB923C",
  pug: "#F472B6",
  treat_biscuit: "#D97706",
  treat_bone: "#EAB308",
  treat_steak: "#EF4444",
  scatter: "#22C55E",
  toaster: "#F97316",
};

export const ICON_SRC: Record<PlSymKind, string> = {
  sym_10: "/images/symbols/pug-den/sym_10.webp",
  sym_j: "/images/symbols/pug-den/sym_j.webp",
  sym_q: "/images/symbols/pug-den/sym_q.webp",
  sym_k: "/images/symbols/pug-den/sym_k.webp",
  sym_a: "/images/symbols/pug-den/sym_a.webp",
  rat: "/images/symbols/pug-den/rat.webp",
  pigeon: "/images/symbols/pug-den/pigeon.webp",
  cat: "/images/symbols/pug-den/cat.png",
  chihuahua: "/images/symbols/pug-den/chihuahua.png",
  pug: "/images/symbols/pug-den/pug.webp",
  treat_biscuit: "/images/symbols/pug-den/treat_biscuit.webp",
  treat_bone: "/images/symbols/pug-den/treat_bone.png",
  treat_steak: "/images/symbols/pug-den/treat_steak.webp",
  scatter: "/images/symbols/pug-den/scatter.webp",
  toaster: "/images/symbols/pug-den/toaster.webp",
};

export const CARD_FRAME_SRC = "/images/symbols/pug-den/card-frame.png";

/** Full-bleed stage backdrop for Pug Den. */
export const STAGE_BG_SRC = "/images/pug-den-bg.webp";
