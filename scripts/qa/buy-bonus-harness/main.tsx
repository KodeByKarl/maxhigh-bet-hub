// QA-only harness: mounts the REAL shared BuyBonusModal for any of the 80 games over that game's backdrop, so screenshots and layout checks
// need no login, database or wallet. `?game=<id>&poor=1` (poor = unaffordable). Not part of the shipped app.
import { createRoot } from "react-dom/client";
import { AnimatePresence } from "framer-motion";
import { BuyBonusModal } from "@/components/maxhigh/buy-bonus/BuyBonusModal";
import {
  buyBonusThemeFromPanther,
  buyBonusThemeFromRealms,
  type BuyBonusTheme,
} from "@/components/maxhigh/buy-bonus/theme";
import { BESPOKE_GAME_IDS } from "@/components/maxhigh/buy-bonus/motifs";
import { REALMS_GAMES } from "@/lib/realms/catalog";
import { realmsAssets } from "@/components/maxhigh/realms/theme";

type PT = Parameters<typeof buyBonusThemeFromPanther>[1] & { assets: { icons: { lollipop: string } } };
const themeModules = import.meta.glob<Record<string, unknown>>("@/components/maxhigh/*/theme.ts", { eager: true });

export function allThemes(): BuyBonusTheme[] {
  const out: BuyBonusTheme[] = [];
  for (const id of BESPOKE_GAME_IDS) {
    if (id === "wild-panther") {
      out.push(
        buyBonusThemeFromPanther(
          id,
          {
            name: "Wild Panther",
            assets: { backdrop: "/images/symbols/wild-panther/backdrop-v20261012-unique.webp" },
            colors: { accent: "#F5C542", accentSoft: "#FDE68A", accentDeep: "#064E3B" },
          },
          "/images/symbols/wild-panther/scatter-v20261012-unique.png",
        ),
      );
      continue;
    }
    const mod = Object.entries(themeModules).find(([p]) => p.includes(`/maxhigh/${id}/theme.ts`))![1];
    const t = Object.values(mod).find((v) => v && typeof v === "object" && "colors" in (v as object)) as PT;
    out.push(buyBonusThemeFromPanther(id, t, t.assets.icons.lollipop));
  }
  for (const def of REALMS_GAMES) {
    const a = realmsAssets(def.id);
    out.push(buyBonusThemeFromRealms(def, { backdrop: a.backdrop, symbolSrc: a.icons.scatter }));
  }
  return out;
}

const q = new URLSearchParams(location.search);
(window as unknown as { __themes: () => string[] }).__themes = () => allThemes().map((t) => t.gameId);
const theme = allThemes().find((t) => t.gameId === q.get("game")) ?? allThemes()[0];
const bet = Number(q.get("bet") ?? 25);

createRoot(document.getElementById("root")!).render(
  <div className="stage" data-game={theme.gameId}>
    {theme.backdropSrc && <img src={theme.backdropSrc} alt="" />}
    <AnimatePresence>
      <BuyBonusModal
        theme={theme}
        bet={bet}
        price={+(bet * 71.3 * 1).toFixed(2)}
        balance={q.get("poor") ? 1 : 100000}
        onConfirm={() => ((document.body.dataset.result = "confirm"))}
        onCancel={() => ((document.body.dataset.result = "cancel"))}
      />
    </AnimatePresence>
  </div>,
);
