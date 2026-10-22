import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { SAFARI_GOLD_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const safariGoldTheme: PantherTheme = {
  id: "safari-gold",
  name: "Safari Gold",
  assets: {
    backdrop: "/images/symbols/safari-gold/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/safari-gold/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("safari-gold", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: SAFARI_GOLD_COLORS,
};
