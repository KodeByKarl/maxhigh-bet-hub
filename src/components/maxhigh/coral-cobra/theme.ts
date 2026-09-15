import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { CORAL_COBRA_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const coralCobraTheme: PantherTheme = {
  id: "coral-cobra",
  name: "Coral Cobra",
  assets: {
    backdrop: "/images/symbols/coral-cobra/backdrop.webp",
    loadingBg: "/images/symbols/coral-cobra/loading-bg.webp",
    icons: themedIconPack("coral-cobra", "5"),
  },
  colors: CORAL_COBRA_COLORS,
};
