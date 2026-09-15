import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { MIDNIGHT_OWL_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const midnightOwlTheme: PantherTheme = {
  id: "midnight-owl",
  name: "Midnight Owl",
  assets: {
    backdrop: "/images/symbols/midnight-owl/backdrop.webp",
    loadingBg: "/images/symbols/midnight-owl/loading-bg.webp",
    icons: themedIconPack("midnight-owl", "5"),
  },
  colors: MIDNIGHT_OWL_COLORS,
};
