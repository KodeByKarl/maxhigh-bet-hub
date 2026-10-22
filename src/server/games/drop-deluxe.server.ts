/**
 * Deluxe Draw (drop-deluxe) — server-authoritative 5-card draw video poker.
 * Deck + dealt hand live in play_sessions.feature_state; the draw is resolved
 * server-side from the held positions only.
 */
import { and, eq } from "drizzle-orm";
import {
  DROP_DELUXE_GAME_ID,
  cardFromId,
  evaluateHand,
  normalizeDropDeluxeConfig,
  type DropDeluxeConfig,
} from "@/lib/drop-deluxe-config";
import type {
  DealResult,
  DrawResult,
  OpenHand,
  OpenHandResult,
} from "@/components/maxhigh/games/drop-deluxe/types";
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

const GAME_NAME = "Deluxe Draw";

type HandState = { deck: number[]; hand: number[] };

let cachedConfig: { cfg: DropDeluxeConfig; time: number } | null = null;

export function clearDropDeluxeEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<DropDeluxeConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeDropDeluxeConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeDropDeluxeConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getDropDeluxeEngineConfigPublic(): Promise<DropDeluxeConfig> {
  return loadEngineConfig();
}

/** Fisher–Yates with a CSPRNG (modulo bias on 2^32 / ≤52 is ~1e-8). */
function shuffledDeck(): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  const buf = new Uint32Array(52);
  crypto.getRandomValues(buf);
  for (let i = 51; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function money(n: number) {
  return +n.toFixed(2);
}

function parseState(raw: string | null): HandState | null {
  if (!raw) return null;
  try {
    const st = JSON.parse(raw) as HandState;
    if (!Array.isArray(st.deck) || !Array.isArray(st.hand) || st.hand.length !== 5) return null;
    return st;
  } catch {
    return null;
  }
}

function openOf(bet: number, st: HandState): OpenHand {
  return { bet, hand: st.hand.map(cardFromId) };
}

const openWhere = (userId: string) =>
  and(
    eq(playSessions.userId, userId),
    eq(playSessions.gameId, DROP_DELUXE_GAME_ID),
    eq(playSessions.status, "open"),
  );

export async function getDropDeluxeOpenHand(): Promise<OpenHandResult> {
  const user = await requireUser();
  const db = getDb();
  const rows = await db.select().from(playSessions).where(openWhere(user.id)).limit(1);
  const row = rows[0];
  const st = row ? parseState(row.featureState) : null;
  if (!row || !st) return { open: null };
  return { open: openOf(Number(row.bet), st) };
}

export async function dropDeluxeDeal(input: { bet: number }): Promise<DealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  const db = getDb();

  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, DROP_DELUXE_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") throw new Error("Deluxe Draw is currently disabled");

  const cfg = await loadEngineConfig();
  const bet = money(Number(input.bet));
  if (!Number.isFinite(bet) || bet < cfg.minBet || bet > cfg.maxBet) {
    throw new Error(`Bet must be between ₱${cfg.minBet} and ₱${cfg.maxBet}`);
  }
  const maxSingle = await getMaxSingleBet();
  if (bet > maxSingle) throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);

  const deck = shuffledDeck();
  const hand = deck.splice(0, 5);
  const state: HandState = { deck, hand };

  const balance = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1).for("update");
    const row = urows[0];
    if (!row) throw new Error("User not found");

    const open = await tx
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(openWhere(user.id))
      .limit(1);
    if (open.length > 0) throw new Error("Finish your current hand first");

    const pending = await sumPendingWithdrawals(tx, user.id);
    if (availableFrom(Number(row.balance), pending) < bet) throw new Error("Insufficient balance");

    const ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -bet,
      type: "bet",
      game: GAME_NAME,
      note: `${DROP_DELUXE_GAME_ID} · ${GAME_NAME} · ₱${bet.toFixed(2)}`,
    });

    await tx.insert(playSessions).values({
      id: newId(),
      userId: user.id,
      gameId: DROP_DELUXE_GAME_ID,
      status: "open",
      bet: bet.toFixed(2),
      featureState: JSON.stringify(state),
    });
    return ledger.balance;
  });

  return { balance, open: openOf(bet, state) };
}

export async function dropDeluxeDraw(input: { holds: boolean[] }): Promise<DrawResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const db = getDb();
  if (input.holds.length !== 5) throw new Error("Invalid holds");

  const out = await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(playSessions)
      .where(openWhere(user.id))
      .limit(1)
      .for("update");
    const row = rows[0];
    const st = row ? parseState(row.featureState) : null;
    if (!row || !st) throw new Error("No active hand — deal first");

    const bet = Number(row.bet);
    const replaced = input.holds.map((h) => !h);
    const hand = st.hand.map((id, i) => (replaced[i] ? (st.deck.shift() as number) : id));
    if (hand.some((id) => id === undefined)) throw new Error("Deck exhausted");

    const result = evaluateHand(hand);
    const mult = result === "none" ? 0 : cfg.paytable[result];
    const payout = money(bet * mult);

    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1).for("update");
    const urow = urows[0];
    if (!urow) throw new Error("User not found");
    let balance = Number(urow.balance);
    if (payout > 0) {
      const ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: urow.username,
        delta: payout,
        type: "win",
        game: GAME_NAME,
        note: `${DROP_DELUXE_GAME_ID} · ${GAME_NAME} · ${result} ×${mult} ₱${payout.toFixed(2)}`,
      });
      balance = ledger.balance;
    }
    await tx
      .update(playSessions)
      .set({ status: "closed", featureState: null })
      .where(eq(playSessions.id, row.id));

    return { balance, bet, hand, replaced, result, mult, payout };
  });

  await recordGameEngineAuditLog({
    gameId: DROP_DELUXE_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: out.bet,
    payoutAmount: out.payout,
    multiplier: out.mult,
    resultMeta: { result: out.result, held: input.holds.filter(Boolean).length },
  });

  return {
    balance: out.balance,
    hand: out.hand.map(cardFromId),
    replaced: out.replaced,
    result: out.result,
    mult: out.mult,
    bet: out.bet,
    payout: out.payout,
  };
}
