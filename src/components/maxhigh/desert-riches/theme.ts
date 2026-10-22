import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { DESERT_RICHES_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const desertRichesTheme: PantherTheme = {
  id: "desert-riches",
  name: "Desert Riches",
  assets: {
    backdrop: "/images/symbols/desert-riches/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/desert-riches/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("desert-riches", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: DESERT_RICHES_COLORS,
};
