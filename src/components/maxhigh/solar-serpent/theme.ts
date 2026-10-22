import { type PantherTheme, type PantherSymKind } from "@/components/maxhigh/panther-shared/theme";
import { SOLAR_SERPENT_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Complete, padded solar serpent symbols for the reels and paytable. */
function serpentIconPack(version = "3"): Record<PantherSymKind, string> {
  const base = "/images/symbols/solar-serpent";
  const v = `?v=${version}`;
  return {
    grape: `${base}/10-v3.png${v}`,
    plum: `${base}/J-v3.png${v}`,
    melon: `${base}/Q-v3.png${v}`,
    apple: `${base}/K-v3.png${v}`,
    blue: `${base}/A-v3.png${v}`,
    green: `${base}/premium-a-v3.png${v}`,
    purple: `${base}/premium-b-v3.png${v}`,
    heart: `${base}/premium-c-v3.png${v}`,
    lollipop: `${base}/scatter-v3.png${v}`,
    bomb: `${base}/wild-v3.png${v}`,
  };
}

export const solarSerpentTheme: PantherTheme = {
  id: "solar-serpent",
  name: "Solar Serpent",
  assets: {
    backdrop: "/images/symbols/solar-serpent/backdrop-v3.webp?v=3",
    loadingBg: "/images/symbols/solar-serpent/backdrop-v3.webp?v=3",
    icons: serpentIconPack("3"),
  },
  colors: SOLAR_SERPENT_COLORS,
};
