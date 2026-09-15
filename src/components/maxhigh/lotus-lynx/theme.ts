import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { LOTUS_LYNX_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const lotusLynxTheme: PantherTheme = {
  id: "lotus-lynx",
  name: "Lotus Lynx",
  assets: {
    backdrop: "/images/symbols/lotus-lynx/backdrop.webp",
    loadingBg: "/images/symbols/lotus-lynx/loading-bg.webp",
    icons: themedIconPack("lotus-lynx", "5"),
  },
  colors: LOTUS_LYNX_COLORS,
};
