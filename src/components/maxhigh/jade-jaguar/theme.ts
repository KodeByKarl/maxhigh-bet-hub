import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { JADE_JAGUAR_COLORS } from "@/components/maxhigh/panther-shared/palettes";

function jadeIconPack(version = "1"): Record<PantherSymKind, string> {
  const base = "/images/symbols/jade-jaguar";
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

export const jadeJaguarTheme: PantherTheme = {
  id: "jade-jaguar",
  name: "Jade Jaguar",
  assets: {
    backdrop: "/images/symbols/jade-jaguar/backdrop.webp",
    loadingBg: "/images/symbols/jade-jaguar/loading-bg.webp",
    icons: jadeIconPack("1"),
  },
  colors: JADE_JAGUAR_COLORS,
};
