import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { THOR_THUNDER_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const thorThunderTheme: PantherTheme = {
  id: "thor-thunder",
  name: "Thor Thunder",
  assets: {
    backdrop: "/images/symbols/thor-thunder/backdrop-v4.webp?v=4",
    loadingBg: "/images/symbols/thor-thunder/backdrop-v4.webp?v=4",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("thor-thunder", "4")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v4.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: THOR_THUNDER_COLORS,
};
