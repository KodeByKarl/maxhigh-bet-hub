import { writeAuditLog } from "../admin/audit.server";

export type GameEngineAuditPayload = {
  gameId: string;
  roundId: string;
  userId: string;
  username: string;
  betAmount: number;
  payoutAmount: number;
  multiplier: number;
  resultMeta?: Record<string, unknown>;
  provablyFairHash?: string;
  nonce?: number;
  clientSeed?: string;
};

/**
 * Game engine audit logger.
 * Writes immutable structured audit logs for every spin / play round safely without interrupting game settlement.
 */
export async function recordGameEngineAuditLog(payload: GameEngineAuditPayload) {
  try {
    const netOutcome = +(payload.payoutAmount - payload.betAmount).toFixed(2);
    const isWin = payload.payoutAmount > payload.betAmount;

    await writeAuditLog({
      actor: { id: payload.userId, username: payload.username },
      action: isWin ? "game.win" : "game.bet",
      summary: `[${payload.gameId}] Bet: ₱${payload.betAmount.toFixed(2)} → Payout: ₱${payload.payoutAmount.toFixed(2)} (${payload.multiplier.toFixed(2)}x)`,
      targetType: "game_round",
      targetId: payload.roundId,
      meta: {
        gameId: payload.gameId,
        roundId: payload.roundId,
        bet: payload.betAmount,
        payout: payload.payoutAmount,
        multiplier: payload.multiplier,
        netOutcome,
        provablyFairHash: payload.provablyFairHash ?? null,
        nonce: payload.nonce ?? null,
        clientSeed: payload.clientSeed ?? null,
        resultMeta: payload.resultMeta ?? null,
      },
    });
  } catch (err) {
    console.error("[GameEngineAudit] Exception while writing audit log:", err);
  }
}
