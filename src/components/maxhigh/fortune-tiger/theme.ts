import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { FORTUNE_TIGER_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const fortuneTigerTheme: PantherTheme = {
  id: "fortune-tiger",
  name: "Fortune Tiger",
  assets: {
    backdrop: "/images/symbols/fortune-tiger/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/fortune-tiger/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("fortune-tiger", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: FORTUNE_TIGER_COLORS,
};
