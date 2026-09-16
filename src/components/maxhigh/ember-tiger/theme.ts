import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { EMBER_TIGER_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Single-subject crops (multi-symbol sheets were leaking into circular cells). */
function emberIconPack(version = "7"): Record<PantherSymKind, string> {
  const base = "/images/symbols/ember-tiger";
  const v = `?v=${version}`;
  return {
    grape: `${base}/10-cell.png${v}`,
    plum: `${base}/J-cell.png${v}`,
    melon: `${base}/Q-cell.png${v}`,
    apple: `${base}/K-cell.png${v}`,
    blue: `${base}/A-cell.png${v}`,
    green: `${base}/premium-a-cell.png${v}`,
    purple: `${base}/premium-b-cell.png${v}`,
    heart: `${base}/premium-c-cell.png${v}`,
    lollipop: `${base}/scatter-cell.png${v}`,
    bomb: `${base}/wild-cell.png${v}`,
  };
}

export const emberTigerTheme: PantherTheme = {
  id: "ember-tiger",
  name: "Ember Tiger",
  assets: {
    backdrop: "/images/symbols/ember-tiger/backdrop.webp",
    loadingBg: "/images/symbols/ember-tiger/loading-bg.webp",
    icons: emberIconPack("7"),
  },
  colors: EMBER_TIGER_COLORS,
};
