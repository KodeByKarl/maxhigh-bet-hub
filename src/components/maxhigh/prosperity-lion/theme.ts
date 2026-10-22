import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { PROSPERITY_LION_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const prosperityLionTheme: PantherTheme = {
  id: "prosperity-lion",
  name: "Prosperity Lion",
  assets: {
    backdrop: "/images/symbols/prosperity-lion/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/prosperity-lion/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("prosperity-lion", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: PROSPERITY_LION_COLORS,
};
