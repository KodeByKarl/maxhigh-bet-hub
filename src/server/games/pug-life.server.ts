/**
 * Pug Life — server-authoritative spin / buy settlement.
 */

import { eq } from "drizzle-orm";
import {
  PUG_LIFE_GAME_ID,
  normalizePugLifeConfig,
  type PugLifeConfig,
} from "@/lib/pug-life-config";
import { getDb } from "../db/client";
import { gameControls, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";
import { setPugLifeConfig } from "@/components/maxhigh/pug-life/runtimeConfig";
import {
  resolvePugLifeBuy,
  resolvePugLifeSpin,
} from "@/components/maxhigh/pug-life/spinResolver";
import { validateBonusBuy } from "@/components/maxhigh/pug-life/buyFeature";
import type { SpinScript } from "@/components/maxhigh/pug-life/types";

const GAME_NAME = "Pug Den";

let cachedConfig: { cfg: PugLifeConfig; time: number } | null = null;

export function clearPugLifeEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<PugLifeConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, PUG_LIFE_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizePugLifeConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizePugLifeConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export type PugLifeSpinResult = {
  balance: number;
  script: SpinScript;
};

async function settleSpin(opts: {
  cost: number;
  script: SpinScript;
  noteBet: string;
  noteWin: string;
  auditExtra?: Record<string, unknown>;
}): Promise<PugLifeSpinResult> {
  const user = await requireUser();
  const roundId = newId();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const balance = Number(row.balance);
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(balance, pending);
    if (opts.cost > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
          : "Insufficient balance",
      );
    }

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -opts.cost,
      type: "bet",
      game: GAME_NAME,
      note: opts.noteBet,
    });

    if (opts.script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: opts.script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: opts.noteWin,
      });
    }

    return { balance: ledger.balance, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: PUG_LIFE_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: opts.cost,
    payoutAmount: opts.script.totalWin,
    multiplier: opts.cost > 0 ? +(opts.script.totalWin / opts.cost).toFixed(4) : 0,
    resultMeta: {
      seed: opts.script.seed,
      entryPath: opts.script.entryPath,
      grid: opts.script.audit.symbols,
      treatMults: opts.script.audit.treatMults,
      paylineWins: opts.script.paylineWins,
      paylineWin: opts.script.paylineWin,
      treatYoSelfTriggered: opts.script.treatYoSelfTriggered,
      dawgsDenTriggered: opts.script.dawgsDenTriggered,
      bonusType: opts.script.bonusSession?.type ?? null,
      bonusTotalWin: opts.script.bonusSession?.totalWin ?? 0,
      potFinal: opts.script.audit.potFinal,
      rawTotalWin: opts.script.rawTotalWin,
      totalWin: opts.script.totalWin,
      hitCap: opts.script.hitCap,
      buyMeta: opts.script.buyMeta,
      ...opts.auditExtra,
    },
  });

  return { balance: result.balance, script: opts.script };
}

export async function pugLifePaidSpin(data: {
  bet: number;
  /** Ante-style FeatureSpins: stake charged × costMult with elevated strips. */
  entryPath?: "base" | "featurespins";
  marketCode?: string | null;
}): Promise<PugLifeSpinResult> {
  await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  setPugLifeConfig(cfg);

  const stake = +data.bet.toFixed(2);
  if (stake < cfg.minBet) throw new Error(`Min bet is ₱${cfg.minBet.toFixed(2)}`);
  if (stake > cfg.maxBet) throw new Error(`Max bet is ₱${cfg.maxBet.toFixed(2)}`);
  const maxBet = await getMaxSingleBet();
  if (stake > maxBet) throw new Error(`Max single bet limit is ₱${maxBet.toFixed(2)}`);

  let cost = stake;
  let entryPath: "base" | "featurespins" = data.entryPath ?? "base";

  if (entryPath === "featurespins") {
    const validation = validateBonusBuy({
      buyId: "featurespins",
      totalBet: stake,
      marketCode: data.marketCode,
      cfg,
    });
    if (!validation.ok) throw new Error(validation.reason);
    cost = validation.cost; // typically 3× stake ante
  }

  await assertNotInMaintenanceForBets();

  const script = resolvePugLifeSpin({
    totalBet: stake,
    entryPath,
    marketCode: data.marketCode,
  });

  return settleSpin({
    cost,
    script,
    noteBet: `${PUG_LIFE_GAME_ID} · ${GAME_NAME} · ${entryPath} wager ₱${cost.toFixed(2)}`,
    noteWin: `${PUG_LIFE_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
  });
}

export async function pugLifeBuyFeature(data: {
  bet: number;
  buyId: "featurespins" | "treat_yoself" | "dawgs_den";
  /** Player regulatory market (e.g. UK). Required for jurisdiction gating. */
  marketCode?: string | null;
}): Promise<PugLifeSpinResult & { buyCost: number }> {
  await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  setPugLifeConfig(cfg);

  const stake = +data.bet.toFixed(2);
  if (stake < cfg.minBet) throw new Error(`Min bet is ₱${cfg.minBet.toFixed(2)}`);
  if (stake > cfg.maxBet) throw new Error(`Max bet is ₱${cfg.maxBet.toFixed(2)}`);

  const validation = validateBonusBuy({
    buyId: data.buyId,
    totalBet: stake,
    marketCode: data.marketCode,
    cfg,
  });
  if (!validation.ok) throw new Error(validation.reason);

  await assertNotInMaintenanceForBets();

  const { cost, script } = resolvePugLifeBuy({
    buyId: data.buyId,
    totalBet: stake,
    marketCode: data.marketCode,
  });

  const result = await settleSpin({
    cost,
    script,
    noteBet: `${PUG_LIFE_GAME_ID} · ${GAME_NAME} · buy:${data.buyId} ₱${cost.toFixed(2)}`,
    noteWin: `${PUG_LIFE_GAME_ID} · ${GAME_NAME} · buy win ₱${script.totalWin.toFixed(2)}`,
    auditExtra: { buyId: data.buyId, marketCode: data.marketCode ?? null },
  });

  return { ...result, buyCost: cost };
}

export async function getPugLifeEngineConfigPublic(): Promise<PugLifeConfig> {
  return loadEngineConfig();
}
