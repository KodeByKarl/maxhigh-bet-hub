import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { GATE_OF_RA_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const gateOfRaTheme: PantherTheme = {
  id: "gate-of-ra",
  name: "Gate of Ra",
  assets: {
    backdrop: "/images/symbols/gate-of-ra/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/gate-of-ra/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("gate-of-ra", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  colors: GATE_OF_RA_COLORS,
};
