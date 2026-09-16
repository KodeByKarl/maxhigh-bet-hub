import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { SOLAR_SERPENT_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Padded single-subject crops for solar-orb cells. */
function serpentIconPack(version = "2"): Record<PantherSymKind, string> {
  const base = "/images/symbols/solar-serpent";
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

export const solarSerpentTheme: PantherTheme = {
  id: "solar-serpent",
  name: "Solar Serpent",
  assets: {
    backdrop: "/images/symbols/solar-serpent/backdrop.webp",
    loadingBg: "/images/symbols/solar-serpent/loading-bg.webp",
    icons: serpentIconPack("2"),
  },
  colors: SOLAR_SERPENT_COLORS,
};
