import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { OLYMPUS_WRATH_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const olympusWrathTheme: PantherTheme = {
  id: "olympus-wrath",
  name: "Olympus Wrath",
  assets: {
    backdrop: "/images/symbols/olympus-wrath/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/olympus-wrath/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("olympus-wrath", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: OLYMPUS_WRATH_COLORS,
};
