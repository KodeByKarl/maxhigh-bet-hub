import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { GODLY_GATES_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const godlyGatesTheme: PantherTheme = {
  id: "godly-gates",
  name: "Godly Gates",
  assets: {
    backdrop: "/images/symbols/godly-gates/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/godly-gates/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("godly-gates", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: GODLY_GATES_COLORS,
};
