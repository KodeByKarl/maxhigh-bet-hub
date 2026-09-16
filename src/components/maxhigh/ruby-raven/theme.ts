import {
  type PantherTheme,
  type PantherSymKind,
} from "@/components/maxhigh/panther-shared/theme";
import { RUBY_RAVEN_COLORS } from "@/components/maxhigh/panther-shared/palettes";

/** Padded single-subject crops for diamond gem cells. */
function ravenIconPack(version = "1"): Record<PantherSymKind, string> {
  const base = "/images/symbols/ruby-raven";
  const v = `?v=${version}`;
  return {
    grape: `${base}/10-cell.png${v}`,
    plum: `${base}/J-cell.png${v}`,
    melon: `${base}/Q-cell.png${v}`,
    apple: `${base}/K-cell.png${v}`,
    blue: `${base}/A-cell.png${v}`,
    green: `${base}/premium-a-cell.png${v}`,
    purple: `${base}/premium-b-cell.png${v}`,
    heart: `${base}/premium-c-cell.png${v}`,
    lollipop: `${base}/scatter-cell.png${v}`,
    bomb: `${base}/wild-cell.png${v}`,
  };
}

export const rubyRavenTheme: PantherTheme = {
  id: "ruby-raven",
  name: "Ruby Raven",
  assets: {
    backdrop: "/images/symbols/ruby-raven/backdrop.webp",
    loadingBg: "/images/symbols/ruby-raven/loading-bg.webp",
    icons: ravenIconPack("1"),
  },
  colors: RUBY_RAVEN_COLORS,
};
