import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { FORTUNE_MOUSE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const fortuneMouseTheme: PantherTheme = {
  id: "fortune-mouse",
  name: "Fortune Mouse",
  assets: {
    backdrop: "/images/symbols/fortune-mouse/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/fortune-mouse/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("fortune-mouse", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: FORTUNE_MOUSE_COLORS,
};
