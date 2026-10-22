import { type PantherTheme, type PantherSymKind } from "@/components/maxhigh/panther-shared/theme";
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
    backdrop: "/images/symbols/ruby-raven/backdrop-v20261013.webp",
    loadingBg: "/images/symbols/ruby-raven/backdrop-v20261013.webp",
    icons: {
      grape: "/images/symbols/ruby-raven/10-v20261013.png",
      plum: "/images/symbols/ruby-raven/J-v20261013.png",
      melon: "/images/symbols/ruby-raven/Q-v20261013.png",
      apple: "/images/symbols/ruby-raven/K-v20261013.png",
      blue: "/images/symbols/ruby-raven/A-v20261013.png",
      green: "/images/symbols/ruby-raven/premium-a-v20261013.png",
      purple: "/images/symbols/ruby-raven/premium-b-v20261013.png",
      heart: "/images/symbols/ruby-raven/premium-c-v20261013.png",
      lollipop: "/images/symbols/ruby-raven/scatter-v20261013.png",
      bomb: "/images/symbols/ruby-raven/wild-v20261013.png",
    },
  },
  colors: RUBY_RAVEN_COLORS,
};
