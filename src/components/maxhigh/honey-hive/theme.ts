import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { HONEY_HIVE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Padded single-subject crops for hex cells. */
function honeyIconPack(version = "2"): Record<PantherSymKind, string> {
  const base = "/images/symbols/honey-hive";
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

export const honeyHiveTheme: PantherTheme = {
  id: "honey-hive",
  name: "Honey Hive",
  assets: {
    backdrop: "/images/symbols/honey-hive/backdrop.webp",
    loadingBg: "/images/symbols/honey-hive/loading-bg.webp",
    icons: honeyIconPack("2"),
  },
  colors: HONEY_HIVE_COLORS,
};
