import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { BUFFALO_REIGN_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const buffaloReignTheme: PantherTheme = {
  id: "buffalo-reign",
  name: "Buffalo Reign",
  assets: {
    backdrop: "/images/symbols/buffalo-reign/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/buffalo-reign/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("buffalo-reign", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: BUFFALO_REIGN_COLORS,
};
