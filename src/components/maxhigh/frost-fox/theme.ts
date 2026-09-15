import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { FROST_FOX_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const frostFoxTheme: PantherTheme = {
  id: "frost-fox",
  name: "Frost Fox",
  assets: {
    backdrop: "/images/symbols/frost-fox/backdrop.webp",
    loadingBg: "/images/symbols/frost-fox/loading-bg.webp",
    icons: themedIconPack("frost-fox", "5"),
  },
  colors: FROST_FOX_COLORS,
};
