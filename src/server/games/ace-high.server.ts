/**
 * Ace High — server-authoritative 2-card deal + auto-War settlement.
 * Client never decides payouts. Stake debited first; credits use basePayoutMult (2 = even money).
 */

import { and, eq } from "drizzle-orm";
import {
  ACE_HIGH_GAME_ID,
  normalizeAceHighConfig,
  type AceHighConfig,
} from "@/lib/ace-high-config";
import { resolveAceHighDeal } from "@/components/maxhigh/ace-high/resolver";
import { setAceHighConfig } from "@/components/maxhigh/ace-high/runtimeConfig";
import type { AceHighFeatureState, PublicDealScript } from "@/components/maxhigh/ace-high/types";
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

const GAME_NAME = "Ace High";

let cachedConfig: { cfg: AceHighConfig; time: number } | null = null;

export function clearAceHighEngineCache() {
  cachedConfig = null;
}

async function loadEngineConfig(): Promise<AceHighConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.time < 30_000) return cachedConfig.cfg;
  const db = getDb();
  try {
    const rows = await db
      .select()
      .from(gameControls)
      .where(eq(gameControls.gameId, ACE_HIGH_GAME_ID))
      .limit(1);
    const raw = rows[0]?.engineConfig;
    const cfg = normalizeAceHighConfig(raw ? (JSON.parse(raw) as unknown) : null);
    cachedConfig = { cfg, time: now };
    return cfg;
  } catch {
    const cfg = normalizeAceHighConfig(null);
    cachedConfig = { cfg, time: now };
    return cfg;
  }
}

export async function getAceHighEngineConfigPublic(): Promise<AceHighConfig> {
  return loadEngineConfig();
}

export type AceHighSessionState = {
  sessionId: string | null;
  open: boolean;
  baseBet: number;
  warMatched: number;
  warDepth: number;
  maxWarDepth: number;
  playerCard: AceHighFeatureState["playerCard"] | null;
  dealerCard: AceHighFeatureState["dealerCard"] | null;
};

function emptySession(cfg?: AceHighConfig): AceHighSessionState {
  return {
    sessionId: null,
    open: false,
    baseBet: 0,
    warMatched: 0,
    warDepth: 0,
    maxWarDepth: cfg?.warMaxDepth ?? 3,
    playerCard: null,
    dealerCard: null,
  };
}

/** Auto-war: no interactive hold. Close any legacy open sessions. */
export async function getAceHighOpenSession(): Promise<AceHighSessionState> {
  const user = await requireUser();
  const cfg = await loadEngineConfig();
  const db = getDb();
  const rows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, ACE_HIGH_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(5);
  for (const row of rows) {
    await db
      .update(playSessions)
      .set({ status: "closed", featureState: null })
      .where(eq(playSessions.id, row.id));
  }
  return emptySession(cfg);
}

export type AceHighDealResult = {
  balance: number;
  script: PublicDealScript;
  session: AceHighSessionState;
};

function toPublicScript(
  script: ReturnType<typeof resolveAceHighDeal>,
): PublicDealScript {
  const last = script.warSteps[script.warSteps.length - 1];
  return {
    playerCards: script.playerCards,
    dealerCards: script.dealerCards,
    playerCard: script.playerCards[0],
    dealerCard: script.dealerCards[0],
    initialOutcome: script.initialOutcome,
    outcome: script.outcome,
    tieWin: script.tieWin,
    aceBonusWin: script.aceBonusWin,
    aceBonusHit: script.aceBonusHit,
    baseWin: script.baseWin,
    pendingWar: false,
    warSteps: script.warSteps,
    warMatched: script.warMatched,
    warDepth: last?.warDepth,
    burned: last?.burned,
    splitPot: script.splitPot,
  };
}

export async function aceHighPaidDeal(input: {
  baseBet: number;
  tieBet?: number;
  aceBonusBet?: number;
}): Promise<AceHighDealResult> {
  await assertNotInMaintenanceForBets();
  const user = await requireUser();

  const db = getDb();
  const controlRows = await db
    .select({ enabled: gameControls.enabled })
    .from(gameControls)
    .where(eq(gameControls.gameId, ACE_HIGH_GAME_ID))
    .limit(1);
  if (controlRows[0]?.enabled === "no") {
    throw new Error("Ace High is currently disabled");
  }

  const cfg = await loadEngineConfig();
  setAceHighConfig(cfg);

  const baseBet = +Number(input.baseBet).toFixed(2);
  const tieBet = +Number(input.tieBet ?? 0).toFixed(2);
  const aceBonusBet = +Number(input.aceBonusBet ?? 0).toFixed(2);

  if (!Number.isFinite(baseBet) || baseBet < cfg.minBet || baseBet > cfg.maxBet) {
    throw new Error(`Base bet must be between ₱${cfg.minBet} and ₱${cfg.maxBet}`);
  }
  if (tieBet < 0 || (tieBet > 0 && (tieBet < cfg.minTieBet || tieBet > cfg.maxTieBet))) {
    throw new Error(`Tie bet must be 0 or between ₱${cfg.minTieBet} and ₱${cfg.maxTieBet}`);
  }
  if (
    aceBonusBet < 0 ||
    (aceBonusBet > 0 &&
      (aceBonusBet < cfg.minAceBonusBet || aceBonusBet > cfg.maxAceBonusBet))
  ) {
    throw new Error(
      `Ace Bonus bet must be 0 or between ₱${cfg.minAceBonusBet} and ₱${cfg.maxAceBonusBet}`,
    );
  }

  const initialCost = +(baseBet + tieBet + aceBonusBet).toFixed(2);
  const maxSingle = await getMaxSingleBet();
  if (initialCost > maxSingle) throw new Error(`Max single wager is ₱${maxSingle.toFixed(2)}`);

  // Resolve math first (no wallet); war match count known before debit loop
  const resolved = resolveAceHighDeal({ baseBet, tieBet, aceBonusBet, cfg });
  const warMatchTotal = resolved.warMatched;
  const totalDebit = +(initialCost + warMatchTotal).toFixed(2);
  if (totalDebit > maxSingle * (1 + cfg.warMaxDepth)) {
    // soft guard — per-match still checked below
  }

  // Close legacy interactive war sessions
  const openRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.userId, user.id),
        eq(playSessions.gameId, ACE_HIGH_GAME_ID),
        eq(playSessions.status, "open"),
      ),
    )
    .limit(5);
  for (const row of openRows) {
    await db
      .update(playSessions)
      .set({ status: "closed", featureState: null })
      .where(eq(playSessions.id, row.id));
  }

  const result = await db.transaction(async (tx) => {
    const urows = await tx.select().from(users).where(eq(users.id, user.id)).limit(1);
    const row = urows[0];
    if (!row) throw new Error("User not found");

    const pending = await sumPendingWithdrawals(tx, user.id);
    let available = availableFrom(Number(row.balance), pending);
    if (available < totalDebit) {
      throw new Error(
        warMatchTotal > 0
          ? `Insufficient balance for deal + auto-War (need ₱${totalDebit.toFixed(2)})`
          : "Insufficient balance",
      );
    }

    // 1) Debit base + side bets once
    let ledger = await writeLedgerDelta(tx, {
      userId: user.id,
      username: row.username,
      delta: -initialCost,
      type: "bet",
      game: GAME_NAME,
      note: `${ACE_HIGH_GAME_ID} · ${GAME_NAME} · base ₱${baseBet.toFixed(2)}${tieBet > 0 ? ` · tie ₱${tieBet.toFixed(2)}` : ""}${aceBonusBet > 0 ? ` · ace ₱${aceBonusBet.toFixed(2)}` : ""}`,
    });
    available = availableFrom(ledger.balance, pending);

    // 2) Debit each auto-war match once (same amount as resolver.warMatched)
    for (const step of resolved.warSteps) {
      if (step.matchAmount > available) {
        throw new Error("Insufficient balance for War match");
      }
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: -step.matchAmount,
        type: "bet",
        game: GAME_NAME,
        note: `${ACE_HIGH_GAME_ID} · ${GAME_NAME} · war match ₱${step.matchAmount.toFixed(2)} · depth ${step.warDepth}`,
      });
      available = availableFrom(ledger.balance, pending);
    }

    // 3) Single win credit: sides + base/war (never double-apply stake)
    const credit = resolved.immediateCredit;
    if (credit > 0) {
      ledger = await writeLedgerDelta(tx, {
        userId: user.id,
        username: row.username,
        delta: credit,
        type: "win",
        game: GAME_NAME,
        note: `${ACE_HIGH_GAME_ID} · ${GAME_NAME} · settle ₱${credit.toFixed(2)}${resolved.splitPot ? " · split" : ""}${resolved.warSteps.length ? ` · war×${resolved.warSteps.length}` : ""}`,
      });
    }

    return { balance: ledger.balance };
  });

  const publicScript = toPublicScript(resolved);

  await recordGameEngineAuditLog({
    gameId: ACE_HIGH_GAME_ID,
    roundId: newId(),
    userId: user.id,
    username: user.username,
    betAmount: totalDebit,
    payoutAmount: resolved.immediateCredit,
    multiplier: totalDebit > 0 ? +(resolved.immediateCredit / totalDebit).toFixed(4) : 0,
    resultMeta: {
      initialOutcome: resolved.initialOutcome,
      outcome: resolved.outcome,
      warSteps: resolved.warSteps.length,
      warMatched: resolved.warMatched,
      splitPot: resolved.splitPot,
      baseBet,
      tieBet,
      aceBonusBet,
    },
  });

  return {
    balance: result.balance,
    script: publicScript,
    session: emptySession(cfg),
  };
}

/** @deprecated Auto-war — no interactive war. */
export async function aceHighGoToWar(): Promise<AceHighDealResult> {
  throw new Error("War is automatic on ties — deal again");
}

/** @deprecated Auto-war — no fold. */
export async function aceHighFold(): Promise<AceHighDealResult> {
  throw new Error("War is automatic on ties — deal again");
}
