// Buy Bonus modal UI regression: all 80 per-game theme configurations render through the ONE shared modal with the client's reference
// fields (Bet, Quantity, Price, Total Price, Buy & Play), reference artwork that exists, and stay readable. Pure UI: no pricing/RTP/payout code is touched here.
import "./lib/stub-css";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BUY_BONUS_MOTIFS, BESPOKE_GAME_IDS } from "../src/components/maxhigh/buy-bonus/motifs";
import {
  buyBonusThemeFromPanther,
  buyBonusThemeFromRealms,
  contrastRatio,
  parseHex,
  readableOn,
  type BuyBonusTheme,
} from "../src/components/maxhigh/buy-bonus/theme";
import { REALMS_GAMES } from "../src/lib/realms/catalog";
import { realmsAssets } from "../src/components/maxhigh/realms/theme";
import { BUY_BONUS_DEFAULT_SPEC, buyBonusTotal } from "../src/lib/buy-bonus";

// ES imports are all *loaded* before any runs, so the CSS stub is installed above and the modal is imported after it.
const { BuyBonusModal } = await import("../src/components/maxhigh/buy-bonus/BuyBonusModal");

const root = path.resolve(import.meta.dirname, "..");
let failures = 0;
function check(ok: boolean, msg: string) {
  if (!ok) {
    failures++;
    console.error("FAIL", msg);
  }
}
const fileExists = (src: string) => fs.existsSync(path.join(root, "public", src.split("?")[0]));

check(BUY_BONUS_DEFAULT_SPEC.quantity.mode === "range", "default spec is a quantity range");

const themes: BuyBonusTheme[] = [];

// 30 bespoke games: each game's own theme.ts + scatter art
const componentsDir = path.join(root, "src/components/maxhigh");
const dirs = fs.readdirSync(componentsDir).filter((d) => fs.existsSync(path.join(componentsDir, d, "BuyFeatureModal.tsx")));
check(dirs.length === 31, `31 BuyFeatureModal wrappers (30 bespoke + realms), found ${dirs.length}`);
for (const id of BESPOKE_GAME_IDS) {
  if (id === "wild-panther") {
    themes.push(
      buyBonusThemeFromPanther(
        id,
        {
          name: "Wild Panther",
          assets: { backdrop: "/images/symbols/wild-panther/backdrop-v20261012-unique.webp" },
          colors: { accent: "#F5C542", accentSoft: "#FDE68A", accentDeep: "#064E3B" },
        },
        (await import("../src/components/maxhigh/wild-panther/paytable")).ICON_SRC.lollipop,
      ),
    );
    continue;
  }
  const mod = (await import(`../src/components/maxhigh/${id}/theme.ts`)) as Record<string, never>;
  const exportName = Object.keys(mod).find((k) => k.endsWith("Theme"))!;
  const t = mod[exportName] as unknown as Parameters<typeof buyBonusThemeFromPanther>[1] & {
    assets: { icons: { lollipop: string } };
  };
  themes.push(buyBonusThemeFromPanther(id, t, t.assets.icons.lollipop));
}
check(BESPOKE_GAME_IDS.length === 30, `30 bespoke motif entries, found ${BESPOKE_GAME_IDS.length}`);
for (const d of dirs) if (d !== "realms") check(d in { ...Object.fromEntries(BESPOKE_GAME_IDS.map((i) => [i, 1])) }, `${d} has a motif`);

// 50 Realms titles
for (const def of REALMS_GAMES) {
  const a = realmsAssets(def.id);
  themes.push(buyBonusThemeFromRealms(def, { backdrop: a.backdrop, symbolSrc: a.icons.scatter }));
}
check(themes.length === 80, `80 theme configurations, found ${themes.length}`);

let minRatio = 99;
const seen = new Map<string, string>();
const motifCount: Record<string, number> = {};
for (const t of themes) {
  const tag = t.gameId;
  motifCount[t.motif] = (motifCount[t.motif] ?? 0) + 1;
  check(t.motif in BUY_BONUS_MOTIFS, `${tag}: known motif`);
  for (const [k, v] of Object.entries({ accent: t.accent, soft: t.accentSoft, deep: t.deep })) {
    check(parseHex(v) !== null, `${tag}: ${k} is a hex colour (${v})`);
  }
  check(fileExists(t.symbolSrc), `${tag}: scatter art exists (${t.symbolSrc})`);
  check(!!t.backdropSrc && fileExists(t.backdropSrc), `${tag}: backdrop exists (${t.backdropSrc})`);
  const sig = `${t.symbolSrc.split("?")[0]}|${t.accent}|${t.deep}`;
  check(!seen.has(sig), `${tag}: visual identity is unique (clashes with ${seen.get(sig)})`);
  seen.set(sig, tag);

  const props = { theme: t, bet: 5, betOptions: [1, 5, 10], quantity: BUY_BONUS_DEFAULT_SPEC.quantity, pricePerUnitMult: () => 42.5, balance: 5000, onConfirm: () => {}, onCancel: () => {} };
  const html = renderToStaticMarkup(createElement(BuyBonusModal, props));
  check(html.includes('role="dialog"') && html.includes('aria-modal="true"'), `${tag}: dialog semantics`);
  check(/aria-labelledby="[^"]+"/.test(html), `${tag}: labelled dialog`);
  for (const s of ["Buy Bonus", "Bet (₱)", "Quantity", "Price", "Total Price", "Free Spin", "Buy &amp; Play", "Cancel"]) {
    check(html.includes(s), `${tag}: shows "${s}"`);
  }
  // client reference: bet 1, quantity 1, price 42.50, total 42.50 (here at bet 5: 212.50)
  check(html.includes("₱ 212.50"), `${tag}: unit price and total at bet 5, quantity 1`);
  check(html.includes('data-bb="quantity"') && html.includes('aria-label="Quantity"'), `${tag}: quantity selector`);
  check(html.includes('data-bb="bet"'), `${tag}: bet selector`);
  const ref = renderToStaticMarkup(createElement(BuyBonusModal, { ...props, bet: 1 }));
  check(ref.includes('data-bb="total-price">₱ 42.50') && ref.includes('data-bb="unit-price">₱ 42.50'), `${tag}: client example, bet 1 x qty 1 = 42.50`);
  check(buyBonusTotal(1, 42.5, 1) === 42.5, "buyBonusTotal client example");
  const locked = renderToStaticMarkup(createElement(BuyBonusModal, { ...props, quantity: { mode: "locked", value: 10 } as const }));
  check(!locked.includes('data-bb="quantity"') && locked.includes("<b>10</b>"), `${tag}: locked spec shows fixed quantity, no selector`);
  check(html.includes(t.gameName.replace(/'/g, "&#x27;")), `${tag}: shows the game name`);
  check(html.includes(t.symbolSrc), `${tag}: featured symbol rendered`);
  check(!/disabled=""[^>]*class="bb-confirm"|class="bb-confirm"[^>]*disabled=""/.test(html), `${tag}: confirm enabled when affordable`);

  const poor = renderToStaticMarkup(createElement(BuyBonusModal, { ...props, balance: 1 }));
  check(/class="bb-confirm"[^>]*disabled|disabled=""[^>]*class="bb-confirm"/.test(poor), `${tag}: confirm disabled when unaffordable`);
  check(poor.includes("Insufficient balance"), `${tag}: insufficient-balance notice`);

  // readability of the confirm label on the accent gradient
  const accentColor = t.accent;
  const ratio = contrastRatio(accentColor, readableOn(accentColor));
  minRatio = Math.min(minRatio, ratio);
  check(ratio >= 4.5, `${tag}: confirm label contrast ${ratio.toFixed(2)} on ${accentColor}`);
}

// the old generic modal must be gone from every game wrapper
for (const d of dirs) {
  const src = fs.readFileSync(path.join(componentsDir, d, "BuyFeatureModal.tsx"), "utf8");
  check(src.includes("BuyBonusModal"), `${d}: uses the shared BuyBonusModal`);
  check(!/from-amber|border-amber-600/.test(src), `${d}: no legacy form markup`);
  check(!src.includes("BUY_BONUS_FREE_SPINS") || d === "wild-panther", `${d}: no global fixed-10 constant`);
}

console.log(`buy-bonus-modal: min confirm-label contrast ${minRatio.toFixed(2)}`);
console.log(`buy-bonus-modal: ${themes.length} themes, motifs ${JSON.stringify(motifCount)}`);
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log("buy-bonus-modal: OK");
