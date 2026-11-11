import { REALMS_GAMES } from "./realms/catalog";

export type SlotControlSkin = {
  style: "temple" | "arcade" | "wild" | "storm" | "forge" | "noir";
  accent: string;
  surface: string;
  ink: string;
  motif: "sun" | "flower" | "paw" | "bolt" | "flame" | "moon";
};

type Row = [string, SlotControlSkin["style"], string, string, string, SlotControlSkin["motif"]];
const rows: Row[] = [
  ["golden-panther", "wild", "#e6bf71", "#20271c", "#fff2d2", "paw"],
  ["wild-panther", "wild", "#a4cba0", "#172a20", "#e2efdc", "paw"],
  ["jade-jaguar", "temple", "#95d6b4", "#1a3832", "#e0f5e7", "paw"],
  ["ember-tiger", "forge", "#ff985a", "#301b17", "#fff0d8", "flame"],
  ["lotus-lynx", "arcade", "#ce75a4", "#efe0e8", "#503246", "flower"],
  ["coral-cobra", "wild", "#ff9a88", "#15343b", "#f4e7d6", "paw"],
  ["frost-fox", "arcade", "#8edce8", "#d9ebf0", "#244855", "paw"],
  ["solar-serpent", "temple", "#efb15f", "#352015", "#ffefd0", "sun"],
  ["honey-hive", "arcade", "#e2a24b", "#f4e5c1", "#603b22", "flower"],
  ["midnight-owl", "noir", "#c1c6ef", "#1a2138", "#edeafb", "moon"],
  ["ruby-raven", "noir", "#df9aac", "#2b1824", "#f9e8e9", "moon"],
  ["lucky-neko", "arcade", "#dc785e", "#f2e7d1", "#5f352a", "paw"],
  ["fortune-tiger", "wild", "#ec7965", "#252420", "#f4e9d5", "paw"],
  ["fortune-ox", "temple", "#9dc0a3", "#24392f", "#e4eed9", "sun"],
  ["fortune-rabbit", "arcade", "#d67ba0", "#f6e4eb", "#63384e", "flower"],
  ["fortune-mouse", "arcade", "#cc9272", "#eee2d1", "#563d35", "paw"],
  ["prosperity-lion", "temple", "#e5b077", "#562f2a", "#fff0d3", "sun"],
  ["buffalo-reign", "wild", "#dfb077", "#33271f", "#f9e8cf", "paw"],
  ["safari-gold", "wild", "#e5b76e", "#403020", "#fff0cf", "sun"],
  ["cleopatra-gold", "temple", "#ddbc75", "#153641", "#f7edd6", "sun"],
  ["maya-gold", "temple", "#a2c5a3", "#273d31", "#eaf3d9", "sun"],
  ["temple-rush", "wild", "#efbc66", "#333426", "#fff0d6", "sun"],
  ["pharaoh-fire", "forge", "#e9ae70", "#34241c", "#f8e6c9", "flame"],
  ["desert-riches", "temple", "#e5c596", "#35352c", "#fff3db", "sun"],
  ["gate-of-ra", "temple", "#f1b77d", "#4b3023", "#fff0d7", "sun"],
  ["zeus-strike", "storm", "#9ddfff", "#142a43", "#edf8ff", "bolt"],
  ["thor-thunder", "storm", "#c2d9e9", "#24303d", "#f2f6ff", "bolt"],
  ["godly-gates", "storm", "#a3d7ee", "#1c3042", "#edf9ff", "bolt"],
  ["olympus-wrath", "storm", "#f59b91", "#341f2d", "#fff0f1", "bolt"],
  ["enchanted-grove", "arcade", "#a0c38c", "#e0e8cf", "#314632", "flower"],
  ["fire-spike", "forge", "#ff826a", "#301a1b", "#fff0df", "flame"],
  ["coin-volcano", "forge", "#ffc466", "#33241b", "#fff0ce", "flame"],
];

export const SLOT_CONTROL_SKINS: Readonly<Record<string, SlotControlSkin>> = Object.fromEntries(
  [
    ...rows,
    ...REALMS_GAMES.map((game): Row => {
      if (game.id === "abyssal-pearls") {
        return [game.id, "noir", "#acd9ea", "#101f37", "#f4eefc", "moon"];
      }
      const styles: Record<string, SlotControlSkin["style"][]> = {
        ocean: ["wild", "noir", "storm", "temple", "arcade"],
        celestial: ["noir", "storm", "arcade", "noir", "temple"],
        volcanic: ["forge", "forge", "noir", "arcade", "temple"],
        frost: ["temple", "wild", "arcade", "storm", "noir"],
        jungle: ["arcade", "noir", "wild", "temple", "arcade"],
        ancient: ["temple", "noir", "wild", "storm", "wild"],
        clockwork: ["forge", "temple", "storm", "noir", "forge"],
        arcane: ["noir", "temple", "noir", "arcade", "forge"],
        cosmos: ["arcade", "storm", "arcade", "forge", "noir"],
        spirit: ["wild", "temple", "noir", "storm", "arcade"],
      };
      const style = styles[game.world][(game.no - 1) % 5];
      const motif: SlotControlSkin["motif"] =
        game.world === "volcanic"
          ? "flame"
          : game.world === "jungle" || game.world === "spirit"
            ? "flower"
            : game.world === "celestial" || game.world === "arcane" || game.world === "cosmos"
              ? "moon"
              : game.world === "clockwork" || game.world === "frost"
                ? "bolt"
                : "sun";
      return [game.id, style, game.palette[2], game.palette[3], "#f3f3ed", motif];
    }),
  ].map(([id, style, accent, surface, ink, motif]) => [id, { style, accent, surface, ink, motif }]),
);
