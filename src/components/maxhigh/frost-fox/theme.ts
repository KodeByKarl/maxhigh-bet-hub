import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { FROST_FOX_COLORS } from "@/components/maxhigh/panther-shared/palettes";

function frostIconPack(version = "12"): Record<PantherSymKind, string> {
  const base = "/images/symbols/frost-fox";
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

export const frostFoxTheme: PantherTheme = {
  id: "frost-fox",
  name: "Frost Fox",
  assets: {
    backdrop: "/images/symbols/frost-fox/backdrop.webp",
    loadingBg: "/images/symbols/frost-fox/loading-bg.webp",
    icons: frostIconPack("12"),
  },
  colors: FROST_FOX_COLORS,
};
