/**
 * Verify the calibrated Panther math on fresh samples: full-round RTP (paid
 * spin + free-spin features), Ante RTP, and Buy Bonus return at several
 * quantities, priced exactly like the servers charge.
 *
 *   npx tsx scripts/qa-panther-rtp.ts                 (all 30, one at a time)
 *   npx tsx scripts/qa-panther-rtp.ts jade-jaguar
 */
import { slotGames } from "../src/lib/games";
import { LOBBY_VISIBLE_GAME_IDS } from "../src/lib/playable-games";
import { pantherBuyPricePerSpin } from "../src/components/maxhigh/panther-shared/buyPricing";
import { loadPanther, maxWinOf, playFeature } from "./panther-sim";

const ROUNDS = Number(process.env.QA_ROUNDS ?? 200_000);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...LOBBY_VISIBLE_GAME_IDS];
for (const id of ids) {
  const g = await loadPanther(id);
  const cfg = g.defaults;
  g.setConfig(cfg);
  const cap = maxWinOf(cfg);
  const target =
    Number((slotGames.find((s) => s.id === id)?.rtp ?? "96.5").replace(/[^\d.]/g, "")) / 100;

  const roundRtp = (ante: boolean) => {
    let paid = 0;
    let triggers = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const s = g.spin({ ante, isFreeSpins: false, acc: 0 });
      let win = Math.min(s.totalWin, cap);
      if (s.freeSpinsAwarded > 0) {
        triggers++;
        win += playFeature(g, cfg, s.freeSpinsAwarded);
      }
      paid += Math.min(win, cap);
    }
    return {
      rtp: paid / (ROUNDS * (ante ? cfg.anteBetMult : 1)),
      every: ROUNDS / Math.max(1, triggers),
    };
  };

  const wild = id === "wild-panther";
  const buy = (q: number) => {
    const n = Math.max(2000, Math.ceil(60_000 / q));
    let paid = 0;
    for (let f = 0; f < n; f++) paid += playFeature(g, cfg, q);
    const price = wild
      ? cfg.buyFeatureMult
      : q * pantherBuyPricePerSpin(id, cfg.buyFeatureMult, cfg.freeSpinsBase, q);
    return paid / n / price;
  };
  const base = roundRtp(false);
  const ante = roundRtp(true);
  const capQ =
    typeof cfg.maxFsSessionSpins === "number" && cfg.maxFsSessionSpins > 0
      ? Math.min(50, cfg.maxFsSessionSpins)
      : 50;
  const buys = wild
    ? `buy (10-spin package) ${pct(buy(cfg.freeSpinsBase))}`
    : `buy ×1 ${pct(buy(1))}  ×${cfg.freeSpinsBase} ${pct(buy(cfg.freeSpinsBase))}  ×${capQ} ${pct(buy(capQ))}`;
  console.log(
    `${id.padEnd(16)} target ${pct(target)}  rtp ${pct(base.rtp)}  FS 1/${base.every.toFixed(0)}  ante ${pct(ante.rtp)}  ${buys}`,
  );
}
