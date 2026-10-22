import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { PHARAOH_FIRE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const pharaohFireTheme: PantherTheme = {
  id: "pharaoh-fire",
  name: "Pharaoh Fire",
  assets: {
    backdrop: "/images/symbols/pharaoh-fire/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/pharaoh-fire/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("pharaoh-fire", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: PHARAOH_FIRE_COLORS,
};
