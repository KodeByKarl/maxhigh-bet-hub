import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { TEMPLE_RUSH_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const templeRushTheme: PantherTheme = {
  id: "temple-rush",
  name: "Temple Rush",
  assets: {
    backdrop: "/images/symbols/temple-rush/backdrop-v4.webp?v=4",
    loadingBg: "/images/symbols/temple-rush/backdrop-v4.webp?v=4",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("temple-rush", "4")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v4.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: TEMPLE_RUSH_COLORS,
};
