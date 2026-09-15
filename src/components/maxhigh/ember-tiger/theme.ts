import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { EMBER_TIGER_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const emberTigerTheme: PantherTheme = {
  id: "ember-tiger",
  name: "Ember Tiger",
  assets: {
    backdrop: "/images/symbols/ember-tiger/backdrop.webp",
    loadingBg: "/images/symbols/ember-tiger/loading-bg.webp",
    icons: themedIconPack("ember-tiger", "5"),
  },
  colors: EMBER_TIGER_COLORS,
};
