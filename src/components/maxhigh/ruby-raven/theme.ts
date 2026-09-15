import {
  themedIconPack,
  type PantherTheme,
} from "@/components/maxhigh/panther-shared/theme";
import { RUBY_RAVEN_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const rubyRavenTheme: PantherTheme = {
  id: "ruby-raven",
  name: "Ruby Raven",
  assets: {
    backdrop: "/images/symbols/ruby-raven/backdrop.webp",
    loadingBg: "/images/symbols/ruby-raven/loading-bg.webp",
    icons: themedIconPack("ruby-raven", "5"),
  },
  colors: RUBY_RAVEN_COLORS,
};
