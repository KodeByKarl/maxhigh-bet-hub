import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { JADE_JAGUAR_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const jadeJaguarTheme: PantherTheme = {
  id: "jade-jaguar",
  name: "Jade Jaguar",
  assets: {
    backdrop: "/images/symbols/jade-jaguar/backdrop.webp",
    loadingBg: "/images/symbols/jade-jaguar/loading-bg.webp",
    icons: themedIconPack("jade-jaguar", "5"),
  },
  colors: JADE_JAGUAR_COLORS,
};
