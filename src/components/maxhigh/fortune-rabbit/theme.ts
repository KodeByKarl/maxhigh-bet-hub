import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { FORTUNE_RABBIT_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const fortuneRabbitTheme: PantherTheme = {
  id: "fortune-rabbit",
  name: "Fortune Rabbit",
  assets: {
    backdrop: "/images/symbols/fortune-rabbit/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/fortune-rabbit/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("fortune-rabbit", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: FORTUNE_RABBIT_COLORS,
};
