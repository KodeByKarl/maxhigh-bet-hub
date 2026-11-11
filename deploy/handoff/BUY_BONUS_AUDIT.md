# Buy Bonus audit and plan (read-only; nothing changed in any game)

Generated evidence: `BUY_BONUS_AUDIT_STATIC.md/.json` (script `scripts/qa/audit-buy-bonus.mjs`).

## What exists today
* 82 slots: 32 with their own component/server/config, 50 on the shared Realms engine. 80 have a server buy flow and a buy control; 2 have none.
* **The purchase is already server-authoritative:** the server validates the balance and debits the cost in one transaction, opens a persisted `play_sessions` row holding the free spins, and the client then plays them through the game's free-spin RPC. Idempotency keys and one-open-feature-per-user guards exist. This matches your wallet requirements.
* **The pricing model is different from the brief.** The player chooses a QUANTITY of bonus spins; cost = `bet x pricePerSpin(quantity) x quantity`.
  * 29 dedicated slots store `buyFeatureMult` 42.5 (Wild Panther 41, calibrated earlier); in these games the stored number is a per-spin unit, so 10 spins cost roughly 42.5x bet, not 100x.
  * The 50 Realms slots store 1.05-8.75: these are PER-SPIN prices taken from a measured RTP curve ("every size returns ~96%", `calibrate-realms.ts`), so a 10-spin purchase costs about 10-88x bet. They are NOT whole-feature multipliers.
* Free-spin counter text found in components is `FREE SPINS · <base>`; no `n/10` counter and no explicit scatter-landing-then-announce step before the first bonus spin was found by the static scan (needs per-game visual verification).

## What this means for the brief
1. **Do not delete "1.x" options.** They are per-spin prices of a calibrated model. Removing them or replacing them with `bet x fixedMultiplier` would change the RTP of 50 games and breaks "preserve existing valid pricing / do not invent multipliers".
2. A fixed `baseBet x buyMultiplier` for a fixed number of spins is a different product model. It needs the client's per-game multipliers and a re-calibration (RTP simulation) before any game switches to it; the repository has no such per-game table.
3. The requested player sequence (reels spin, scatters land, scatter animation, announcement, `FREE SPINS 1/10`..`10/10`, total win, back to base) is largely a PRESENTATION change on top of the existing server session: the server result must stay authoritative and the scatter landing must be driven by it. It can be implemented per family with shared helpers, but each game's reel/scatter assets and animation system differ (32 dedicated components + 1 shared Realms component).

## Proposed plan (nothing started)
* Phase 0 (done here): static inventory.
* Phase 1: visual audit of 5-6 representative games (one per family) with screenshots of the current buy flow.
* Phase 2: shared presentation layer (scatter-landing + announcement + `n/N` counter + total win) behind the existing server session; keep quantity pricing unless the client supplies fixed multipliers.
* Phase 3: per-family rollout, with automated tests for the items in section 9 of the brief, regression on all 100 games.
* Phase 4: staging as a separate release after the current client handover release is live.

## Decisions needed from the owner
1. Keep the existing calibrated pricing (recommended) or move to fixed per-game multipliers (needs a table from the client plus RTP re-calibration).
2. Priority/sequence relative to the current handover (release 07d670a).
3. Scope of the first iteration (representative families first vs all 82 slots).
