import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { FORTUNE_OX_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const fortuneOxTheme: PantherTheme = {
  id: "fortune-ox",
  name: "Fortune Ox",
  assets: {
    backdrop: "/images/symbols/fortune-ox/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/fortune-ox/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("fortune-ox", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: FORTUNE_OX_COLORS,
};
