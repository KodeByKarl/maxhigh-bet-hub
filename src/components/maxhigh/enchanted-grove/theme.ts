import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { ENCHANTED_GROVE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const enchantedGroveTheme: PantherTheme = {
  id: "enchanted-grove",
  name: "Enchanted Grove",
  assets: {
    backdrop: "/images/symbols/enchanted-grove/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/enchanted-grove/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("enchanted-grove", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: ENCHANTED_GROVE_COLORS,
};
