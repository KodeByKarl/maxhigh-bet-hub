/**
 * Lechon Luck — server-authoritative spin settlement, gamble round, audit.
 */

import { and, eq } from "drizzle-orm";
import {
  LECHON_LUCK_GAME_ID,
  normalizeLechonLuckConfig,
  type LechonLuckConfig,
} from "@/lib/lechon-luck-config";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { newId, requireUser } from "../session";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";
import { recordGameEngineAuditLog } from "./game-audit.server";

import { resolveGamble } from "@/components/maxhigh/lechon-luck/gambleEngine";
import { setLechonLuckConfig } from "@/components/maxhigh/lechon-luck/runtimeConfig";
import { resolveLechonLuckSpin } from "@/components/maxhigh/lechon-luck/spinResolver";
import type { GambleChoice, SpinScript } from "@/components/maxhigh/lechon-luck/types";
import { newSpinSeed } from "@/components/maxhigh/lechon-luck/rng";

const GAME_NAME = "Lechon Luck";

let cachedConfig: { cfg: LechonLuckConfig; time: number } | null = null;

export function clearLechonLuckEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<LechonLuckConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LECHON_LUCK_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeLechonLuckConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeLechonLuckConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

type GambleFeatureState = {
  kind: "gamble";
  amount: number;
  roundsUsed: number;
  totalBet: number;
  seedBase: string;
};

function parseFeatureState(raw: string | null): GambleFeatureState | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as GambleFeatureState;
    if (o?.kind !== "gamble") return null;
    return o;
  } catch {
    return null;
  }
}

export type LechonLuckSessionState = {
  sessionId: string | null;
  pendingWin: number;
  gambleRoundsUsed: number;
  canGamble: boolean;
  totalBet: number;
  inGamble: boolean;
};

export type LechonLuckSpinResult = {
  balance: number;
  script: SpinScript;
  session: LechonLuckSessionState;
  /** True when win was credited immediately (auto-collect / no win). */
  collected: boolean;
};

export type LechonLuckGambleApiResult = {
  balance: number;
  result: ReturnType<typeof resolveGamble>;
  session: LechonLuckSessionState;
  collected: boolean;
};

export type LechonLuckCollectResult = {
  balance: number;
  amount: number;
  session: LechonLuckSessionState;
};

function emptySession(): LechonLuckSessionState {
  return {
    sessionId: null,
    pendingWin: 0,
    gambleRoundsUsed: 0,
    canGamble: false,
    totalBet: 0,
    inGamble: false,
  };
}

export async function getLechonLuckOpenSession(): Promise<LechonLuckSessionState> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, LECHON_LUCK_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const cfg = await loadEngineConfig();
  const row = rows[0] ?? null;
  if (!row) return emptySession();
  const feat = parseFeatureState(row.featureState);
  if (!feat) return emptySession();
  return {
    sessionId: row.id,
    pendingWin: feat.amount,
    gambleRoundsUsed: feat.roundsUsed,
    canGamble: feat.amount > 0 && feat.roundsUsed < cfg.gambleMaxRounds,
    totalBet: feat.totalBet,
    inGamble: true,
  };
}

export async function lechonLuckPaidSpin(data: {
  bet: number;
  /** Autoplay / turbo collect — skip gamble hold. */
  autoCollect?: boolean;
}): Promise<LechonLuckSpinResult> {
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet amount");

  const cfg = await loadEngineConfig();
  setLechonLuckConfig(cfg);

  if (data.bet < cfg.minBet || data.bet > cfg.maxBet) {
    throw new Error(`Bet must be between ${cfg.minBet} and ${cfg.maxBet}`);
  }

  const cost = +data.bet.toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max single bet limit is ₱${maxBet.toFixed(2)}`);

  await assertNotInMaintenanceForBets();

  const db = getDb();
  const existing = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, LECHON_LUCK_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  if (existing[0] && parseFeatureState(existing[0].featureState)) {
    throw new Error("Collect or finish the Gamble round before placing a new bet.");
  }

  const script = resolveLechonLuckSpin({ totalBet: cost });
  const autoCollect = data.autoCollect ?? cfg.autoplayDeclineGamble;
  const shouldHoldGamble = script.totalWin > 0 && script.gambleAvailable && !autoCollect;
  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    const balance = Number(row.balance);
    const pending = await sumPendingWithdrawals(tx, user.id);
    const available = availableFrom(balance, pending);
    if (cost > available) {
      throw new Error(
        pending > 0
          ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
          : "Insufficient balance",
      );
    }

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: GAME_NAME,
      note: `${LECHON_LUCK_GAME_ID} · ${GAME_NAME} · wager ₱${cost.toFixed(2)}`,
    });

    let sessionRow: typeof playSessions.$inferSelect | null = null;
    let collected = true;

    if (shouldHoldGamble) {
      // Close any stale sessions
      const stale = await tx
        .select()
        .from(playSessions)
        .where(
          and(
            eq(playSessions.userId, user.id),
            eq(playSessions.gameId, LECHON_LUCK_GAME_ID),
            eq(playSessions.status, "open"),
          ),
        );
      for (const s of stale) {
        await tx
          .update(playSessions)
          .set({ status: "closed", freeSpinsLeft: 0 })
          .where(eq(playSessions.id, s.id));
      }

      const feat: GambleFeatureState = {
        kind: "gamble",
        amount: script.totalWin,
        roundsUsed: 0,
        totalBet: cost,
        seedBase: script.seed,
      };
      const sid = newId();
      await tx.insert(playSessions).values({
        id: sid,
        userId: user.id,
        gameId: LECHON_LUCK_GAME_ID,
        status: "open",
        freeSpinsLeft: 0,
        fsSessionWin: String(script.totalWin),
        fsBombAcc: "0",
        fsSpinsPlayed: 0,
        bet: String(cost),
        ante: "no",
        featureState: JSON.stringify(feat),
      });
      const updated = await tx.select().from(playSessions).where(eq(playSessions.id, sid)).limit(1);
      sessionRow = updated[0] ?? null;
      collected = false;
    } else if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: GAME_NAME,
        note: `${LECHON_LUCK_GAME_ID} · ${GAME_NAME} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    return { balance: ledger.balance, sessionRow, username: row.username, collected };
  });

  void recordGameEngineAuditLog({
    gameId: LECHON_LUCK_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: cost,
    payoutAmount: result.collected ? script.totalWin : 0,
    multiplier: cost > 0 ? script.totalWin / cost : 0,
    resultMeta: {
      seed: script.seed,
      paylineWin: script.paylineWin,
      dragon: script.dragonBonus
        ? { launches: script.dragonBonus.launches.length, coins: script.dragonBonus.totalCoins }
        : null,
      monkey: script.monkeyBonus
        ? {
            trigger: script.monkeyBonus.triggerPayout,
            extra: script.monkeyBonus.extraScatterSymbol,
            fs: script.monkeyBonus.freeSpinsAwarded,
            fsWin: script.freeSpinsTotalWin,
          }
        : null,
      totalWin: script.totalWin,
      hitCap: script.hitCap,
      gambleHeld: !result.collected && script.totalWin > 0,
    },
  });

  const cfgForSession = cfg;
  let session = emptySession();
  if (result.sessionRow) {
    const feat = parseFeatureState(result.sessionRow.featureState);
    if (feat) {
      session = {
        sessionId: result.sessionRow.id,
        pendingWin: feat.amount,
        gambleRoundsUsed: feat.roundsUsed,
        canGamble: feat.roundsUsed < cfgForSession.gambleMaxRounds,
        totalBet: feat.totalBet,
        inGamble: true,
      };
    }
  }

  return {
    balance: result.balance,
    script,
    session,
    collected: result.collected,
  };
}

export async function lechonLuckCollect(data: {
  sessionId: string;
}): Promise<LechonLuckCollectResult> {
  const user = await requireUser();
  await assertNotInMaintenanceForBets();
  const db = getDb();

  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, LECHON_LUCK_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const current = rows[0];
  const feat = current ? parseFeatureState(current.featureState) : null;
  if (!current || !feat) throw new Error("No pending win to collect");

  const amount = feat.amount;
  const roundId = newId();

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    let balance = Number(row.balance);
    if (amount > 0) {
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: amount,
        type: "win",
        game: GAME_NAME,
        note: `${LECHON_LUCK_GAME_ID} · ${GAME_NAME} · collect ₱${amount.toFixed(2)}`,
      });
      balance = ledger.balance;
    }

    await tx
      .update(playSessions)
      .set({ status: "closed", freeSpinsLeft: 0, featureState: null })
      .where(eq(playSessions.id, current.id));

    return { balance, username: row.username };
  });

  void recordGameEngineAuditLog({
    gameId: LECHON_LUCK_GAME_ID,
    roundId,
    userId: user.id,
    username: result.username,
    betAmount: 0,
    payoutAmount: amount,
    multiplier: 0,
    resultMeta: { collect: true, amount, gambleRoundsUsed: feat.roundsUsed },
  });

  return { balance: result.balance, amount, session: emptySession() };
}

export async function lechonLuckGamble(data: {
  sessionId: string;
  choice: GambleChoice;
}): Promise<LechonLuckGambleApiResult> {
  const user = await requireUser();
  await assertNotInMaintenanceForBets();
  const cfg = await loadEngineConfig();
  setLechonLuckConfig(cfg);

  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, data.sessionId),
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, LECHON_LUCK_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);

  const current = rows[0];
  const feat = current ? parseFeatureState(current.featureState) : null;
  if (!current || !feat || feat.amount <= 0) throw new Error("No pending win to gamble");
  if (feat.roundsUsed >= cfg.gambleMaxRounds) throw new Error("Gamble round limit reached");

  const seed = `${feat.seedBase}-gamble-${feat.roundsUsed}-${newSpinSeed("g")}`;
  const result = resolveGamble({
    seed,
    choice: data.choice,
    stake: feat.amount,
    roundsUsed: feat.roundsUsed,
    totalBet: feat.totalBet,
    cfg,
  });

  const roundId = newId();

  const out = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = userRows[0];
    if (!row) throw new Error("User account not found");

    if (!result.won || result.amount <= 0) {
      await tx
        .update(playSessions)
        .set({ status: "closed", freeSpinsLeft: 0, featureState: null, fsSessionWin: "0" })
        .where(eq(playSessions.id, current.id));
      return {
        balance: Number(row.balance),
        session: emptySession(),
        collected: true,
        username: row.username,
      };
    }

    const nextFeat: GambleFeatureState = {
      ...feat,
      amount: result.amount,
      roundsUsed: result.roundsUsed,
    };

    if (!result.canGambleAgain) {
      // Auto-credit when cap / max rounds hit
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: result.amount,
        type: "win",
        game: GAME_NAME,
        note: `${LECHON_LUCK_GAME_ID} · ${GAME_NAME} · gamble settle ₱${result.amount.toFixed(2)}`,
      });
      await tx
        .update(playSessions)
        .set({ status: "closed", freeSpinsLeft: 0, featureState: null, fsSessionWin: String(result.amount) })
        .where(eq(playSessions.id, current.id));
      return {
        balance: ledger.balance,
        session: emptySession(),
        collected: true,
        username: row.username,
      };
    }

    await tx
      .update(playSessions)
      .set({
        featureState: JSON.stringify(nextFeat),
        fsSessionWin: String(result.amount),
      })
      .where(eq(playSessions.id, current.id));

    return {
      balance: Number(row.balance),
      session: {
        sessionId: current.id,
        pendingWin: result.amount,
        gambleRoundsUsed: result.roundsUsed,
        canGamble: true,
        totalBet: feat.totalBet,
        inGamble: true,
      } satisfies LechonLuckSessionState,
      collected: false,
      username: row.username,
    };
  });

  void recordGameEngineAuditLog({
    gameId: LECHON_LUCK_GAME_ID,
    roundId,
    userId: user.id,
    username: out.username,
    betAmount: 0,
    payoutAmount: out.collected && result.won ? result.amount : 0,
    multiplier: 0,
    resultMeta: {
      gamble: true,
      choice: result.choice,
      drawn: result.drawn,
      won: result.won,
      amount: result.amount,
      roundsUsed: result.roundsUsed,
      seed,
    },
  });

  return {
    balance: out.balance,
    result,
    session: out.session,
    collected: out.collected,
  };
}
