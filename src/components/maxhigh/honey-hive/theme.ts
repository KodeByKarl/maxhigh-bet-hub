import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { HONEY_HIVE_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const honeyHiveTheme: PantherTheme = {
  id: "honey-hive",
  name: "Honey Hive",
  assets: {
    backdrop: "/images/symbols/honey-hive/backdrop.webp",
    loadingBg: "/images/symbols/honey-hive/loading-bg.webp",
    icons: themedIconPack("honey-hive", "5"),
  },
  colors: HONEY_HIVE_COLORS,
};
