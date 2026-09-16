import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { MIDNIGHT_OWL_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Soft moon-disc crops for circle cells. */
function owlIconPack(version = "2"): Record<PantherSymKind, string> {
  const base = "/images/symbols/midnight-owl";
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

export const midnightOwlTheme: PantherTheme = {
  id: "midnight-owl",
  name: "Midnight Owl",
  assets: {
    backdrop: "/images/symbols/midnight-owl/backdrop.webp",
    loadingBg: "/images/symbols/midnight-owl/loading-bg.webp",
    icons: owlIconPack("2"),
  },
  colors: MIDNIGHT_OWL_COLORS,
};
