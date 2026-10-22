/**
 * QA for the 50-title Realms family.
 *
 *   npx tsx scripts/qa-realms-family.ts          static checks + engine smoke test
 *   npx tsx scripts/qa-realms-family.ts --rtp    also verifies RTP with independent seeds
 */
import fs from "node:fs";
import path from "node:path";
import { slotGames } from "../src/lib/games";
import {
  FAMILY_LOBBY_VISIBLE,
  REALMS_GAMES,
  REALMS_GAME_IDS,
  normalizeRealmsGameConfig,
  realmsBuyMaxQuantity,
  realmsBuyPricePerSpin,
  realmsCells,
  realmsDefaultConfig,
} from "../src/lib/realms";
import { REALMS_TUNING } from "../src/lib/realms/calibration";
import { REALMS_BUY_CURVE } from "../src/lib/realms/buy-curve";
import { ANTE_BET_MULT, TARGET_RTP } from "../src/lib/realms/defaults";
import { ALL_KINDS, remainingFreeSpinsAfterSpin } from "../src/lib/realms/schema";
import { isAdminListedGame, isLobbyVisibleGame } from "../src/lib/playable-games";
import { isRegisteredPlayableGame } from "../src/components/maxhigh/gamePlayRegistry";
import { realmsAssets } from "../src/components/maxhigh/realms/theme";
import { finalizeFreeSpinTotal } from "../src/components/maxhigh/realms/engine/multiplierEngine";
import { resolveSpin } from "../src/components/maxhigh/realms/engine/spinResolver";
import { createEngineCtx } from "../src/components/maxhigh/realms/engine/types";
import { mulberry32, simulate } from "./realms-sim";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEPRECATED = [
  "targetRtp",
  "exBetMult",
  "activeRtpProfile",
  "paylineCount",
  "minBet",
  "maxBet",
  "freeSpinsBaseCount",
  "chestTriggerCount",
  "superBuyFeatureMult",
  "seedMelonBiasPercent",
];

let failures = 0;
function check(ok: boolean, msg: string) {
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${msg}`);
  }
}

// ── identity & registration ────────────────────────────────────────────────
check(REALMS_GAMES.length === 50, `50 titles (found ${REALMS_GAMES.length})`);
check(new Set(REALMS_GAME_IDS).size === 50, "unique ids / slugs");
check(new Set(REALMS_GAMES.map((g) => g.name)).size === 50, "unique names");
check(new Set(REALMS_GAMES.map((g) => g.no)).size === 50, "unique catalog numbers");

const familyIds = new Set(REALMS_GAME_IDS);
const others = slotGames.filter((g) => !familyIds.has(g.id));
for (const g of REALMS_GAMES) {
  const row = slotGames.filter((s) => s.id === g.id);
  check(row.length === 1, `${g.id}: exactly one catalog row`);
  check(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.id), `${g.id}: kebab-case slug`);
  check(
    !others.some((o) => o.name.toLowerCase() === g.name.toLowerCase()),
    `${g.id}: name collides with existing game`,
  );
  check(isRegisteredPlayableGame(g.id), `${g.id}: registered in gamePlayRegistry`);
  check(
    isLobbyVisibleGame(g.id) === FAMILY_LOBBY_VISIBLE,
    `${g.id}: lobby visibility follows FAMILY_LOBBY_VISIBLE`,
  );
  check(isAdminListedGame(g.id), `${g.id}: listed in superadmin`);
  check(Boolean(REALMS_TUNING[g.id]), `${g.id}: calibrated`);

  // ── art ──
  const assets = realmsAssets(g.id);
  const files = [
    assets.backdrop,
    assets.loadingBg,
    ...Object.values(assets.icons),
    row[0]?.thumb ?? "",
  ].map((u) => path.join(ROOT, "public", u.split("?")[0]));
  for (const f of files) check(fs.existsSync(f), `${g.id}: missing art ${path.relative(ROOT, f)}`);
  for (const m of [...g.premiums, g.scatter, g.bomb]) {
    const src = fs.readFileSync(
      path.join(ROOT, "node_modules/lucide-react/dist/esm/icons", `${m.icon}.js`),
      "utf8",
    );
    check(src.includes("__iconNode"), `${g.id}: glyph "${m.icon}" is an alias`);
  }

  // ── config ──
  const cfg = realmsDefaultConfig(g.id);
  const cells = realmsCells(g);
  const json = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
  for (const key of DEPRECATED) check(!(key in json), `${g.id}: deprecated field ${key}`);
  check(
    JSON.stringify(normalizeRealmsGameConfig(g.id, json)) === JSON.stringify(cfg),
    `${g.id}: DB round-trip changes the config`,
  );
  check(JSON.stringify(cfg).includes("null") === false, `${g.id}: config contains null`);
  check(cfg.symbols.map((s) => s.id).join() === ALL_KINDS.join(), `${g.id}: symbol set`);
  check(
    cfg.symbols.every((s) => s.pay.every((p) => Number.isFinite(p) && p >= 0)),
    `${g.id}: pays finite`,
  );
  check(
    cfg.minCluster < cells && cfg.seedClusterMax <= cells,
    `${g.id}: cluster sizes fit ${cells} cells`,
  );
  check(cfg.symbols.find((s) => s.scatter)!.weight > 0, `${g.id}: scatter can land`);
  check(cfg.buyFeatureMult > 0 && cfg.anteBetMult === ANTE_BET_MULT, `${g.id}: buy / ante prices`);
  check(cfg.maxFsSessionSpins >= cfg.freeSpinsBase, `${g.id}: session cap holds the award`);
  const curve = REALMS_BUY_CURVE[g.id] ?? [];
  check(curve.length >= realmsBuyMaxQuantity(cfg), `${g.id}: buy curve covers every quantity`);
  check(
    curve.every((v, i) => v > 0 && (i === 0 || v >= curve[i - 1]!)),
    `${g.id}: buy curve positive and non-decreasing`,
  );
  check(
    Math.abs(realmsBuyPricePerSpin(g.id, cfg, g.freeSpins) - cfg.buyFeatureMult) < 0.011,
    `${g.id}: curve anchored at buyFeatureMult`,
  );

  // ── engine smoke ──
  const rng = mulberry32(g.no);
  for (let i = 0; i < 150; i++) {
    const s = resolveSpin(createEngineCtx(cfg, g.board, rng), {
      bet: 1,
      ante: i % 3 === 0,
      isFreeSpins: i % 5 === 0,
    });
    check(s.initialBoard.length === cells, `${g.id}: board size`);
    check(Number.isFinite(s.totalWin) && s.totalWin >= 0, `${g.id}: win is a number`);
    for (const step of s.steps)
      check(step.afterFall.length === cells, `${g.id}: tumble keeps board size`);
  }
}

console.log(`static checks: ${failures === 0 ? "PASS" : `${failures} failure(s)`}`);

// ── RTP verification (independent seeds) ──────────────────────────────────
function buyRtp(id: string, quantity: number, features: number, seed: number) {
  const def = REALMS_GAMES.find((g) => g.id === id)!;
  const cfg = realmsDefaultConfig(id);
  const rng = mulberry32(seed);
  let paid = 0;
  for (let f = 0; f < features; f++) {
    const ctx = createEngineCtx(cfg, def.board, rng);
    let left = quantity;
    let played = 0;
    let win = 0;
    let bomb = 0;
    while (left > 0) {
      const s = resolveSpin(ctx, {
        bet: 1,
        ante: false,
        isFreeSpins: true,
        initialBombAccumulator: bomb,
      });
      win = +(win + s.totalWin).toFixed(2);
      bomb = s.bombAccumulator;
      played += 1;
      left = remainingFreeSpinsAfterSpin({
        leftBefore: left,
        retrigger: s.retriggerSpins,
        playedAfter: played,
        maxSessionSpins: cfg.maxFsSessionSpins,
      });
    }
    paid += Math.min(finalizeFreeSpinTotal(cfg, win, bomb), cfg.maxWinMult);
  }
  return paid / (features * quantity * realmsBuyPricePerSpin(id, cfg, quantity));
}

if (process.argv.includes("--rtp")) {
  const rounds = Number(process.env.QA_ROUNDS ?? 150_000);
  const only = process.env.QA_ONLY?.split(",");
  console.log(
    `\nRTP verification — ${rounds.toLocaleString()} rounds per title, target ${(TARGET_RTP * 100).toFixed(1)}%`,
  );
  for (const g of REALMS_GAMES.filter((x) => !only || only.includes(x.id))) {
    const cfg = realmsDefaultConfig(g.id);
    const r = simulate(cfg, g.board, { rounds, seed: 900_000 + g.no });
    const cap = realmsBuyMaxQuantity(realmsDefaultConfig(g.id));
    const buys = [1, g.freeSpins, cap].map(
      (q) =>
        [
          q,
          buyRtp(g.id, q, Math.max(1500, Math.ceil(30_000 / q)), 800_000 + g.no * 7 + q),
        ] as const,
    );
    console.log(
      `${String(g.no).padStart(2)} ${g.id.padEnd(22)} rtp ${(r.rtp * 100).toFixed(2)}%  ` +
        `hit ${(r.hitRate * 100).toFixed(1)}%  FS 1/${r.triggerEvery.toFixed(0)}  ` +
        `buy ${buys.map(([q, r]) => `×${q} ${(r * 100).toFixed(1)}%`).join("  ")}`,
    );
  }
}

process.exit(failures === 0 ? 0 : 1);
