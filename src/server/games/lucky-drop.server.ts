/**
 * Royal Climb (lucky-drop) — server-authoritative Hi-Lo ladder.
 * The shuffled deck lives only in play_sessions.feature_state; the client sees
 * the current card, remaining rank counts, and exact odds — never the order.
 */
import { and, eq } from "drizzle-orm";
import {
  LUCKY_DROP_GAME_ID,
  cardFromId,
  normalizeLuckyDropConfig,
  oddsFor,
  rankCountsFromDeck,
  type LuckyDropConfig,
  type Pick,
} from "@/lib/lucky-drop-config";
import type {
  ClimbResult,
  RunView,
  SessionResult,
} from "@/components/maxhigh/games/lucky-drop/types";
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

const GAME_NAME = "Royal Climb";

type RunState = {
  /** Remaining deck, next draw first. */
  deck: number[];
  card: number;
  steps: number;
  mult: number;
  skipsLeft: number;
  trail: number[];
};

let cachedConfig: { cfg: LuckyDropConfig; time: number } | null = null;

export function clearLuckyDropEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<LuckyDropConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeLuckyDropConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeLuckyDropConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getLuckyDropEngineConfigPublic(): Promise<LuckyDropConfig> {
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

function viewOf(bet: number, st: RunState, cfg: LuckyDropConfig): RunView {
  const rankCounts = rankCountsFromDeck(st.deck);
  const card = cardFromId(st.card);
  return {
    bet,
    card,
    steps: st.steps,
    maxSteps: cfg.maxSteps,
    mult: st.mult,
    payout: money(bet * st.mult),
    skipsLeft: st.skipsLeft,
    rankCounts,
    remaining: st.deck.length,
    higher: oddsFor("higher", card.rank, rankCounts, cfg.houseEdge),
    lower: oddsFor("lower", card.rank, rankCounts, cfg.houseEdge),
    trail: st.trail.map(cardFromId),
  };
}

function parseState(raw: string | null): RunState | null {
  if (!raw) return null;
  try {
    const st = JSON.parse(raw) as RunState;
    if (!Array.isArray(st.deck) || typeof st.card !== "number") return null;
    return st;
  } catch {
    return null;
  }
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Actor = { id: string; username: string };

async function lockOpenRun(tx: Tx, userId: string) {
  const rows = await tx
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, userId),
        eq(playSessions.gameId, LUCKY_DROP_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1)
    .for("update");
  const row = rows[0];
  if (!row) throw new Error("No active climb — start a new run");
  const st = parseState(row.featureState);
  if (!st) throw new Error("Run state lost — start a new run");
  return { row, st };
}

async function balanceOf(tx: Tx, userId: string) {
  const u = await tx
    .select({ balance: users.balance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Number(u[0]?.balance ?? 0);
}

export async function getLuckyDropOpenRun(): Promise<SessionResult> {
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, LUCKY_DROP_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(1);
  const row = rows[0];
  const st = row ? parseState(row.featureState) : null;
  if (!row || !st) return { run: null };
  return { run: viewOf(Number(row.bet), st, cfg) };
}

export async function luckyDropStart(input: { bet: number }): Promise<ClimbResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  const db = getDb();

  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, LUCKY_DROP_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") throw new Error("Royal Climb is currently disabled");

  const cfg = await loadEngineConfig();
  const bet = money(Number(input.bet));
  if (!Number.isFinite(bet) || bet < cfg.minBet || bet > cfg.maxBet) {
    throw new Error(`Bet must be between ₱${cfg.minBet} and ₱${cfg.maxBet}`);
  }
  const maxSingle = await getMaxSingleBet();
  if (bet > maxSingle) throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);

  const deck = shuffledDeck();
  const card = deck.shift() as number;
  const state: RunState = { deck, card, steps: 0, mult: 1, skipsLeft: cfg.skips, trail: [] };

  const balance = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1).for("update");
    const row = urows[0];
    if (!row) throw new Error("User not found");

    const open = await tx
      .select({ id: playSessions.id })
      .from(playSessions)
      .where(
        and(
          eq(playSessions.userId, user.id),
          eq(playSessions.gameId, LUCKY_DROP_GAME_ID),
          eq(playSessions.status, "open"),
        ),
      )
      .limit(1);
    if (open.length > 0) throw new Error("Finish your current climb first");

    const pending = await sumPendingWithdrawals(tx, user.id);
    if (availableFrom(Number(row.balance), pending) < bet) throw new Error("Insufficient balance");

    const ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -bet,
      type: "bet",
      game: GAME_NAME,
      note: `${LUCKY_DROP_GAME_ID} · ${GAME_NAME} · ₱${bet.toFixed(2)}`,
    });

    await tx.insert(playSessions).values({
      id: newId(),
      userId: user.id,
      gameId: LUCKY_DROP_GAME_ID,
      status: "open",
      bet: bet.toFixed(2),
      featureState: JSON.stringify(state),
    });
    return ledger.balance;
  });

  return {
    balance,
    outcome: "continue",
    run: viewOf(bet, state, cfg),
    drawn: null,
    payout: 0,
    mult: 1,
  };
}

/** Close a finished run and credit `payout` (0 on bust). */
async function settle(tx: Tx, user: Actor, sessionId: string, st: RunState, payout: number) {
  const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1).for("update");
  const row = urows[0];
  if (!row) throw new Error("User not found");
  let balance = Number(row.balance);
  if (payout > 0) {
    const ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: payout,
      type: "win",
      game: GAME_NAME,
      note: `${LUCKY_DROP_GAME_ID} · ${GAME_NAME} · ×${st.mult.toFixed(2)} ₱${payout.toFixed(2)}`,
    });
    balance = ledger.balance;
  }
  await tx
    .update(playSessions)
    .set({ status: "closed", featureState: null })
    .where(eq(playSessions.id, sessionId));
  return balance;
}

async function audit(user: Actor, bet: number, payout: number, st: RunState, result: string) {
  await recordGameEngineAuditLog({
    gameId: LUCKY_DROP_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: bet,
    payoutAmount: payout,
    multiplier: bet > 0 ? +(payout / bet).toFixed(4) : 0,
    resultMeta: { result, steps: st.steps, mult: st.mult, skipsLeft: st.skipsLeft },
  });
}

export async function luckyDropGuess(input: { pick: Pick }): Promise<ClimbResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const db = getDb();

  const out = await db.transaction(async (tx) => {
    const { row, st } = await lockOpenRun(tx, user.id);
    const bet = Number(row.bet);
    const rank = cardFromId(st.card).rank;
    const odds = oddsFor(input.pick, rank, rankCountsFromDeck(st.deck), cfg.houseEdge);
    if (!odds) throw new Error("That call is impossible from this card");

    const nextId = st.deck.shift();
    if (nextId === undefined) throw new Error("Deck exhausted");
    const drawn = cardFromId(nextId);
    const won = input.pick === "higher" ? drawn.rank > rank : drawn.rank < rank;

    if (!won) {
      const balance = await settle(tx, user, row.id, st, 0);
      return {
        balance,
        bet,
        st,
        payout: 0,
        drawn,
        outcome: "bust" as const,
        run: null,
        auto: false,
      };
    }

    st.trail.push(st.card);
    st.card = nextId;
    st.steps += 1;
    st.mult = Math.min(cfg.maxMult, +(st.mult * odds.mult).toFixed(4));

    const counts = rankCountsFromDeck(st.deck);
    const stuck =
      !oddsFor("higher", drawn.rank, counts, cfg.houseEdge) &&
      !oddsFor("lower", drawn.rank, counts, cfg.houseEdge);
    if (st.steps >= cfg.maxSteps || st.mult >= cfg.maxMult || stuck) {
      const payout = money(bet * st.mult);
      const balance = await settle(tx, user, row.id, st, payout);
      return { balance, bet, st, payout, drawn, outcome: "cashed" as const, run: null, auto: true };
    }

    await tx
      .update(playSessions)
      .set({ featureState: JSON.stringify(st) })
      .where(eq(playSessions.id, row.id));
    return {
      balance: await balanceOf(tx, user.id),
      bet,
      st,
      payout: 0,
      drawn,
      outcome: "continue" as const,
      run: viewOf(bet, st, cfg),
      auto: false,
    };
  });

  if (out.outcome !== "continue") {
    await audit(user, out.bet, out.payout, out.st, out.outcome === "bust" ? "bust" : "auto-cash");
  }
  return {
    balance: out.balance,
    outcome: out.outcome,
    run: out.run,
    drawn: out.drawn,
    payout: out.payout,
    mult: out.st.mult,
    auto: out.auto,
  };
}

export async function luckyDropSkip(): Promise<ClimbResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const db = getDb();

  return db.transaction(async (tx) => {
    const { row, st } = await lockOpenRun(tx, user.id);
    if (st.skipsLeft <= 0) throw new Error("No skips left");
    if (st.deck.length < 2) throw new Error("Deck too thin to skip");
    const nextId = st.deck.shift() as number;
    st.trail.push(st.card);
    st.card = nextId;
    st.skipsLeft -= 1;
    await tx
      .update(playSessions)
      .set({ featureState: JSON.stringify(st) })
      .where(eq(playSessions.id, row.id));
    return {
      balance: await balanceOf(tx, user.id),
      outcome: "continue" as const,
      run: viewOf(Number(row.bet), st, cfg),
      drawn: cardFromId(nextId),
      payout: 0,
      mult: st.mult,
    };
  });
}

export async function luckyDropCashout(): Promise<ClimbResult> {
  const user = await requireUser();
  const db = getDb();

  const out = await db.transaction(async (tx) => {
    const { row, st } = await lockOpenRun(tx, user.id);
    if (st.steps < 1) throw new Error("Make at least one correct call before cashing out");
    const bet = Number(row.bet);
    const payout = money(bet * st.mult);
    const balance = await settle(tx, user, row.id, st, payout);
    return { balance, bet, st, payout };
  });

  await audit(user, out.bet, out.payout, out.st, "cashout");
  return {
    balance: out.balance,
    outcome: "cashed",
    run: null,
    drawn: null,
    payout: out.payout,
    mult: out.st.mult,
  };
}
