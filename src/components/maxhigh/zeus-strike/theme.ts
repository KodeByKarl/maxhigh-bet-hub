import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { ZEUS_STRIKE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const zeusStrikeTheme: PantherTheme = {
  id: "zeus-strike",
  name: "Zeus Strike",
  assets: {
    backdrop: "/images/symbols/zeus-strike/backdrop-v6.webp?v=6",
    loadingBg: "/images/symbols/zeus-strike/backdrop-v6.webp?v=6",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("zeus-strike", "6")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v6.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: ZEUS_STRIKE_COLORS,
};
