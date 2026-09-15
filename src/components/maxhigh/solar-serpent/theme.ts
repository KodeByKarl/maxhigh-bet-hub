import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { SOLAR_SERPENT_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const solarSerpentTheme: PantherTheme = {
  id: "solar-serpent",
  name: "Solar Serpent",
  assets: {
    backdrop: "/images/symbols/solar-serpent/backdrop.webp",
    loadingBg: "/images/symbols/solar-serpent/loading-bg.webp",
    icons: themedIconPack("solar-serpent", "5"),
  },
  colors: SOLAR_SERPENT_COLORS,
};
