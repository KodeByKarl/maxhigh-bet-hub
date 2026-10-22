import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { CLEOPATRA_GOLD_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const cleopatraGoldTheme: PantherTheme = {
  id: "cleopatra-gold",
  name: "Cleopatra Gold",
  assets: {
    backdrop: "/images/symbols/cleopatra-gold/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/cleopatra-gold/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("cleopatra-gold", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: CLEOPATRA_GOLD_COLORS,
};
