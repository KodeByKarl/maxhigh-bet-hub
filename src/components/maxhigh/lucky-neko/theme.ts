import { themedIconPack, type PantherTheme } from "@/components/maxhigh/panther-shared/theme";
import { LUCKY_NEKO_COLORS } from "@/components/maxhigh/panther-shared/palettes";

export const luckyNekoTheme: PantherTheme = {
  id: "lucky-neko",
  name: "Lucky Neko",
  assets: {
    backdrop: "/images/symbols/lucky-neko/backdrop-v20261012.webp?v=20261012",
    loadingBg: "/images/symbols/lucky-neko/backdrop-v20261012.webp?v=20261012",
    icons: Object.fromEntries(
      Object.entries(themedIconPack("lucky-neko", "20261012")).map(([kind, src]) => [
        kind,
        src.replace(".png", "-v20261012.png"),
      ]),
    ) as PantherTheme["assets"]["icons"],
  },
  // Imperial palace palette: lacquer red / champagne gold / ivory / sakura over the shared Lucky Neko base.
  colors: {
    ...LUCKY_NEKO_COLORS,
    accent: "#D9B86A",
    accentSoft: "#F3E0A6",
    accentDeep: "#2A0A10",
    rim: "rgba(217,184,106,0.6)",
    spinFrom: "#D4414A",
    spinMid: "#9A1D26",
    spinTo: "#4D0B14",
    spinShadow: "rgba(212,65,74,0.5)",
    hudBorder: "rgba(217,184,106,0.45)",
    hudLabel: "rgba(243,224,166,0.8)",
    hudValue: "#F7ECD6",
    winBorder: "rgba(217,184,106,0.6)",
    winFrom: "rgba(77,11,20,0.94)",
    winLabel: "#F7ECD6",
    winValue: "#F4B6C6",
    tumbleFrom: "#D4414A",
    tumbleTo: "#4D0B14",
    tumbleBorder: "#D9B86A",
    tumbleText: "#F7ECD6",
    winRing: "rgba(244,182,198,0.4)",
  },
};
