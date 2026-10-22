import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { MAYA_GOLD_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const mayaGoldTheme: PantherTheme = {
  id: "maya-gold",
  name: "Maya Gold",
  assets: {
    backdrop: "/images/symbols/maya-gold/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/maya-gold/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("maya-gold", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: MAYA_GOLD_COLORS,
};
