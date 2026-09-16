import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { LOTUS_LYNX_COLORS } from "@/components/maxhigh/panther-shared/palettes";

function lotusIconPack(version = "2"): Record<PantherSymKind, string> {
  const base = "/images/symbols/lotus-lynx";
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

export const lotusLynxTheme: PantherTheme = {
  id: "lotus-lynx",
  name: "Lotus Lynx",
  assets: {
    backdrop: "/images/symbols/lotus-lynx/backdrop.webp",
    loadingBg: "/images/symbols/lotus-lynx/loading-bg.webp",
    icons: lotusIconPack("2"),
  },
  colors: LOTUS_LYNX_COLORS,
};
