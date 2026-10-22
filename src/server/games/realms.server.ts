/**
 * Realms family — server-authoritative spin settlement for all 50 titles.
 * The client only receives scripts and balances; it cannot choose outcomes.
 *
 * One module serves every title: each call names its gameId, which must be a
 * registered Realms title, and loads that title's config from game_controls.
 */
import { and, eq } from "drizzle-orm";
import {
  getRealmsGame,
  isRealmsGameId,
  normalizeRealmsGameConfig,
  realmsBuyMaxQuantity,
  realmsBuyPricePerSpin,
  type RealmsGameDef,
} from "@/lib/realms";
import { remainingFreeSpinsAfterSpin, type RealmsConfig } from "@/lib/realms/schema";
import { BUY_FS_BET_MAX } from "@/components/maxhigh/realms/engine/paytable";
import { finalizeFreeSpinTotal } from "@/components/maxhigh/realms/engine/multiplierEngine";
import { resolveSpin } from "@/components/maxhigh/realms/engine/spinResolver";
import { createEngineCtx, type SpinScript } from "@/components/maxhigh/realms/engine/types";
import { getDb } from "../db/client";
import { gameControls, playSessions, users } from "../db/schema";
import { money, newId, requireUser } from "../session";
import { applyCapToScriptTotalWin, enforcePoolCap } from "../settlement/enforcePoolCap";
import {
  assertNotInMaintenanceForBets,
  availableFrom,
  getMaxSingleBet,
  sumPendingWithdrawals,
  writeLedgerDelta,
} from "../wallet.server";

export type RealmsSessionState = {
  sessionId: string | null;
  freeSpinsLeft: number;
  fsSessionWin: number;
  fsBombAcc: number;
  fsSpinsPlayed: number;
  inFree: boolean;
  bet: number;
  ante: boolean;
};

export type RealmsSpinResult = {
  balance: number;
  script: SpinScript;
  session: RealmsSessionState;
  /** Set when a free-spin feature just finished and its win was paid. */
  fsPayout?: {
    amount: number;
    baseEarn: number;
    multiplier: number;
    spinsPlayed: number;
  };
};

function requireTitle(gameId: string): RealmsGameDef {
  if (!isRealmsGameId(gameId)) throw new Error("Unknown game");
  return getRealmsGame(gameId);
}

/** Current config for a title — read on every spin so superadmin saves apply immediately. */
export async function loadRealmsEngineConfig(gameId: string): Promise<RealmsConfig> {
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, gameId))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    return normalizeRealmsGameConfig(gameId, raw ? (JSON.parse(raw) as unknown) : null);
  } catch {
    return normalizeRealmsGameConfig(gameId, null);
  }
}

function resolve(
  def: RealmsGameDef,
  cfg: RealmsConfig,
  opts: {
    bet: number;
    ante: boolean;
    isFreeSpins: boolean;
    initialBombAccumulator?: number;
  },
): SpinScript {
  return resolveSpin(createEngineCtx(cfg, def.board), opts);
}

function sessionState(row: typeof playSessions.$inferSelect | null): RealmsSessionState {
  if (!row || row.status !== "open") {
    return {
      sessionId: null,
      freeSpinsLeft: 0,
      fsSessionWin: 0,
      fsBombAcc: 0,
      fsSpinsPlayed: 0,
      inFree: false,
      bet: 0,
      ante: false,
    };
  }
  return {
    sessionId: row.id,
    freeSpinsLeft: Number(row.freeSpinsLeft),
    fsSessionWin: Number(row.fsSessionWin),
    fsBombAcc: Number(row.fsBombAcc),
    fsSpinsPlayed: Number(row.fsSpinsPlayed),
    inFree: Number(row.freeSpinsLeft) > 0,
    bet: Number(row.bet),
    ante: row.ante === "yes",
  };
}

function openSessionWhere(userId: string, gameId: string) {
  return and(
    eq(playSessions.userId, userId),
    eq(playSessions.gameId, gameId),
    eq(playSessions.status, "open"),
  );
}

function insufficient(pending: number) {
  return new Error(
    pending > 0
      ? `Insufficient available balance (₱${pending.toFixed(2)} held for pending withdrawal)`
      : "Insufficient balance",
  );
}

export async function getRealmsOpenSession(gameId: string): Promise<RealmsSessionState> {
  requireTitle(gameId);
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(playSessions)
    .where(openSessionWhere(user.id, gameId))
    .limit(1);
  return sessionState(rows[0] ?? null);
}

export async function realmsPaidSpin(data: {
  gameId: string;
  bet: number;
  ante: boolean;
}): Promise<RealmsSpinResult> {
  const def = requireTitle(data.gameId);
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0) throw new Error("Invalid bet");

  const cfg = await loadRealmsEngineConfig(def.id);
  const cost = +(data.bet * (data.ante ? cfg.anteBetMult : 1)).toFixed(2);
  const maxBet = await getMaxSingleBet();
  if (cost > maxBet) throw new Error(`Max bet is ₱${maxBet.toFixed(2)}`);
  await assertNotInMaintenanceForBets();

  const db = getDb();
  const existing = await db
    .select()
    .from(playSessions)
    .where(openSessionWhere(user.id, def.id))
    .limit(1);
  if (existing[0] && Number(existing[0].freeSpinsLeft) > 0) {
    throw new Error("Finish free spins before placing a new bet");
  }

  const script = resolve(def, cfg, { bet: data.bet, ante: data.ante, isFreeSpins: false });
  applyCapToScriptTotalWin(script, {
    gameId: def.id,
    gameName: def.name,
    bet: data.bet,
    maxWinMult: cfg.maxWinMult,
    context: "paid-spin",
  });

  const result = await db.transaction(async (tx) => {
    const row = (await tx.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    if (!row) throw new Error("User not found");
    const pending = await sumPendingWithdrawals(tx, user.id);
    if (cost > availableFrom(Number(row.balance), pending)) throw insufficient(pending);

    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: def.name,
      note: `${def.id} · ${def.name} · wager ₱${cost.toFixed(2)}`,
    });
    if (script.totalWin > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: script.totalWin,
        type: "win",
        game: def.name,
        note: `${def.id} · ${def.name} · win ₱${script.totalWin.toFixed(2)}`,
      });
    }

    let sessionRow: typeof playSessions.$inferSelect | null = null;
    if (script.freeSpinsAwarded > 0) {
      await tx
        .update(playSessions)
        .set({ status: "closed", freeSpinsLeft: 0 })
        .where(openSessionWhere(user.id, def.id));
      const id = newId();
      await tx.insert(playSessions).values({
        id,
        userId: user.id,
        gameId: def.id,
        status: "open",
        bet: money(data.bet),
        ante: data.ante ? "yes" : "no",
        freeSpinsLeft: script.freeSpinsAwarded,
        fsSessionWin: "0.00",
        fsBombAcc: "0.00",
        fsSpinsPlayed: 0,
      });
      sessionRow =
        (await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1))[0] ?? null;
    }
    return { balance: ledger.balance, sessionRow };
  });

  return { balance: result.balance, script, session: sessionState(result.sessionRow) };
}

export async function realmsFreeSpin(data: {
  gameId: string;
  sessionId: string;
}): Promise<RealmsSpinResult> {
  const def = requireTitle(data.gameId);
  const user = await requireUser();
  const db = getDb();

  const session = (
    await db
      .select()
      .from(playSessions)
      .where(and(eq(playSessions.id, data.sessionId), openSessionWhere(user.id, def.id)))
      .limit(1)
  )[0];
  if (!session) throw new Error("Free spin session not found");
  if (Number(session.freeSpinsLeft) <= 0) throw new Error("No free spins remaining");

  const bet = Number(session.bet);
  const cfg = await loadRealmsEngineConfig(def.id);
  // The engine keeps the strongest bomb seen, starting from the banked value.
  const script = resolve(def, cfg, {
    bet,
    ante: false,
    isFreeSpins: true,
    initialBombAccumulator: Number(session.fsBombAcc) || 0,
  });
  applyCapToScriptTotalWin(script, {
    gameId: def.id,
    gameName: def.name,
    bet,
    maxWinMult: cfg.maxWinMult,
    context: "free-spin",
  });

  const result = await db.transaction(async (tx) => {
    const row = (
      await tx
        .select()
        .from(playSessions)
        .where(and(eq(playSessions.id, data.sessionId), eq(playSessions.status, "open")))
        .for("update")
        .limit(1)
    )[0];
    if (!row) throw new Error("Free spin session not found");
    const left = Number(row.freeSpinsLeft);
    if (left <= 0) throw new Error("No free spins remaining");

    const u = (await tx.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    if (!u) throw new Error("User not found");

    const nextWin = +(Number(row.fsSessionWin) + script.totalWin).toFixed(2);
    // Published rule: free spins keep the strongest bomb (already maxed by the engine).
    const nextBomb = script.bombAccumulator;
    const nextPlayed = Number(row.fsSpinsPlayed) + 1;
    const nextLeft = remainingFreeSpinsAfterSpin({
      leftBefore: left,
      retrigger: script.retriggerSpins,
      playedAfter: nextPlayed,
      maxSessionSpins: cfg.maxFsSessionSpins,
    });

    if (nextLeft === 0) {
      const final = enforcePoolCap({
        gameId: def.id,
        gameName: def.name,
        bet,
        maxWinMult: cfg.maxWinMult,
        computedWin: finalizeFreeSpinTotal(cfg, nextWin, nextBomb),
        context: "free-spins-final",
      }).payout;
      let balance = Number(u.balance);
      if (final > 0) {
        balance = (
          await writeLedgerDelta(tx, {
            userId: user.id,
            username: u.username,
            delta: final,
            type: "win",
            game: def.name,
            note: `${def.id} · ${def.name} · free spins win ₱${final.toFixed(2)}`,
          })
        ).balance;
      }
      await tx
        .update(playSessions)
        .set({
          status: "closed",
          freeSpinsLeft: 0,
          fsSessionWin: money(nextWin),
          fsBombAcc: money(nextBomb),
          fsSpinsPlayed: nextPlayed,
        })
        .where(eq(playSessions.id, row.id));
      return {
        balance,
        session: {
          sessionId: null,
          freeSpinsLeft: 0,
          fsSessionWin: nextWin,
          fsBombAcc: nextBomb,
          fsSpinsPlayed: nextPlayed,
          inFree: false,
          bet,
          ante: row.ante === "yes",
        } satisfies RealmsSessionState,
        fsPayout: {
          amount: final,
          baseEarn: nextWin,
          multiplier: nextBomb,
          spinsPlayed: Math.max(nextPlayed, 1),
        },
      };
    }

    await tx
      .update(playSessions)
      .set({
        freeSpinsLeft: nextLeft,
        fsSessionWin: money(nextWin),
        fsBombAcc: money(nextBomb),
        fsSpinsPlayed: nextPlayed,
      })
      .where(eq(playSessions.id, row.id));
    const updated = (
      await tx.select().from(playSessions).where(eq(playSessions.id, row.id)).limit(1)
    )[0];
    return {
      balance: Number(u.balance),
      session: sessionState(updated ?? null),
      fsPayout: undefined,
    };
  });

  return { balance: result.balance, script, session: result.session, fsPayout: result.fsPayout };
}

/**
 * Buy Bonus: `quantity` free spins at `bet` (Panther format: Bet × Quantity).
 * The feature multiplier applies once per session, so the per-spin price comes
 * from the title's measured curve for this quantity — every size returns ~96%.
 */
export async function realmsBuyFeature(data: {
  gameId: string;
  bet: number;
  quantity: number;
}): Promise<{ balance: number; session: RealmsSessionState }> {
  const def = requireTitle(data.gameId);
  const user = await requireUser();
  if (!Number.isFinite(data.bet) || data.bet <= 0 || data.bet > BUY_FS_BET_MAX)
    throw new Error("Invalid bet");
  const cfg = await loadRealmsEngineConfig(def.id);
  const quantity = Math.round(data.quantity);
  const maxQuantity = realmsBuyMaxQuantity(cfg);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > maxQuantity) {
    throw new Error(`Buy 1–${maxQuantity} free spins`);
  }
  const cost = +(data.bet * realmsBuyPricePerSpin(def.id, cfg, quantity) * quantity).toFixed(2);
  await assertNotInMaintenanceForBets();

  const result = await getDb().transaction(async (tx) => {
    const row = (await tx.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    if (!row) throw new Error("User not found");
    const pending = await sumPendingWithdrawals(tx, user.id);
    if (cost > availableFrom(Number(row.balance), pending)) throw insufficient(pending);

    await tx
      .update(playSessions)
      .set({ status: "closed", freeSpinsLeft: 0 })
      .where(openSessionWhere(user.id, def.id));

    const bought = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -cost,
      type: "bet",
      game: def.name,
      note: `${def.id} · ${def.name} · buy feature ×${quantity} ₱${cost.toFixed(2)}`,
    });

    const id = newId();
    await tx.insert(playSessions).values({
      id,
      userId: user.id,
      gameId: def.id,
      status: "open",
      bet: money(data.bet),
      ante: "no",
      freeSpinsLeft: quantity,
      fsSessionWin: "0.00",
      fsBombAcc: "0.00",
      fsSpinsPlayed: 0,
    });
    const created = (
      await tx.select().from(playSessions).where(eq(playSessions.id, id)).limit(1)
    )[0];
    return { balance: bought.balance, session: sessionState(created ?? null) };
  });

  return result;
}
