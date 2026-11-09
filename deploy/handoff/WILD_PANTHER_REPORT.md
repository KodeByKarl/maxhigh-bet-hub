# Wild Panther - defect, calibration and RTP validation report

Status: LOCAL ONLY. Verified on a disposable clone. NOT deployed to UAT. Evidence folder: `C:\Users\Keydi\maxhigh-evidence\` (paths below).

## 1. Original defect (confirmed)
| Symptom | Measurement |
|---|---|
| Free spins never ended (UAT/clone QA) | 3,000 spins played with 4,905 left; retrigger 46-53% x 5 spins |
| RTP of the shipped defaults | **713,919%** (repo script `scripts/qa-panther-rtp.ts`), free spins every 1 spin |
| Clone ledger after play | one player 100,000 -> 16.6 million; Wild Panther paid 16.5M on 2.8k wagered |

Root causes (all in the un-calibrated "Sweet Bonanza style" defaults of a 46-cell grid):
1. `minCluster` 8 on 46 cells with 8 symbol types: an 8-of-a-kind cluster appears on almost every board.
2. 62% of boards additionally force-seeded with an 8-12 cluster; bomb multipliers (up to 100x, 22% per cell in free spins) summed and multiplied the whole feature.
3. Scatters spawned in tumble refills and were counted over up to 40 tumbles -> free spins on ~72% of spins, retrigger branching factor 2.65 (> 1 = endless).
4. Only the final payout was capped (10,000x); nothing bounded feature length.
The 29 sibling Panther titles had been calibrated (`scripts/calibrate-panther.ts`); Wild Panther never was.

## 2. Final configuration (`src/lib/wild-panther-config.ts`)
| Parameter | Old | New |
|---|---|---|
| minCluster | 8 | 12 |
| deadSpinChancePercent | 38 | 82 |
| seedClusterMin/Max | 8/12 | 12/13 |
| bombChanceBase / FreeSpins % | 4 / 22 | 1.5 / 3 |
| bombTable | 2x-100x (12 tiers) | 2x,3x,4x,5x |
| scatter weight | 3.2 | 1.292 |
| freeSpinsRetriggerCount / award | 3 / 5 | 4 / 5 |
| anteScatterWeightMult | 2 | **1.27** (calibrator said 1.319; measured 100.4% RTP, so lowered) |
| buyFeatureMult (price of whole 10-spin package) | 100 | **41** (calibrator's 4.1 is per spin; see 4) |
| pays (x bet, per cluster tier) | 0.2-500 range raw | scaled x0.0946 (e.g. grape 0.02/0.03/0.08, heart 1.14/7.57/47.31) |
| maxFsSessionSpins (new, hard ceiling) | none | 100 |
| tumble refills | could spawn scatters | never spawn scatters (same rule as golden-panther) |

## 3. Measured RTP (seeded, independent of the calibrator)
Method: `scripts/qa/wild-panther-validate.ts` - real engine, server-equivalent feature finalisation, per-round cap and ceiling.
RTP = E[base round win incl. scatter cash] + P(trigger) x E[feature win]; 95% CI by the delta method over base spins and features.
Evidence: `maxhigh-evidence\rtp-validation\validate-FINAL-MAIN.json`, `validate-FINAL-ANTE.json` (2,000,000 base spins + 150,000 features each).

| Mode | RTP | 95% CI | Contains 96.5% |
|---|---|---|---|
| Base game (bet 1) | 96.51% | 95.27 - 97.74% | yes |
| Ante bet (1.25x) | 96.41% | 95.30 - 97.52% | yes |
| Buy feature (41x) | 96.30% | 94.67 - 97.94% | yes |
| Earlier replicates (multiplier 1.319 / price 4.1 config, same method) | main 96.28% / 96.36% | 95.05-97.51 / 95.12-97.61 | yes |
| Bet 0.20 (minimum), earlier config | 95.77% | 94.37 - 97.17% | yes |

Other measured behaviour (final config): hit frequency 20.5%; free spins 1 in ~244 spins (ante 1 in ~108); retrigger 0.38% per free spin; feature length mean 10.2 / median 10 / p99 15 / max 25; ceiling (100) hit by 0% of features; features at the 10,000x cap 0%; largest observed feature win 4,278x, largest base round 805x.
Base game contributes ~80% of RTP, features ~17% (ante: ~31%).

## 4. Defects found during validation (all fixed before this report)
* **Ante bet RTP 100.4%** (player-favourable) at the calibrator's 1.319 multiplier -> lowered to 1.27 (measured 96.4%).
* **Buy-feature price 24x too low.** Server charges `bet x buyFeatureMult` for the whole package; calibrator's 4.1 is per spin. At 4.1 the feature was sold at ~10% of its value (~970% return). Price set to 41. Verified end to end (`scripts/qa/wp-buy-check.mjs`): charged exactly 41x at bets 0.2 / 1 / 5 / 200, ledger balanced, Super Buy refused.
* Calibrator single-title mode printed no parameters; added `CAL_JSON` output and live progress to `scripts/calibrate-panther.ts` (stderr).

## 5. Free-spin ceiling comparison (same seeds per feature; pre-calibration pays, i.e. relative effect)
| Ceiling | Features hitting it | Awarded spins trimmed | Longest feature |
|---|---|---|---|
| 40 | 1.40% | 0.54% | 40 |
| 60 | 0.33% | 0.16% | 60 |
| 100 | 0.07% | 0.02% | 100 |
| 200 | 0% | 0% | 105 |
Under the final config features never exceed 25 spins (retriggers are rare), so the ceiling is a pure safety backstop. It removes only *awarded retrigger spins* beyond the ceiling and never reduces winnings already earned. 100 was chosen; the paytable states it. (Script: `scripts/qa/wild-panther-cap.ts`; not re-run on final pays.)

## 6. Tests
`scripts/test-wild-panther.ts` (12 checks: refills never spawn scatters, opening-board scatter counting, cap maths with config-driven pays, retrigger branching < 0.9, features bounded by the ceiling). Unit suite 23/23, typecheck and lint clean on touched files, 100-game clone suite 1,561 checks x repeated runs 0 failures, browser: game opens, paytable shows the new rules, Buy Bonus shows 41x.

## 7. Remaining risks / limitations (honest)
* Retriggers are now very rare (0.38%/spin) - the "retrigger" feature is nearly decorative. A design choice for the owner/client; it can be raised by increasing the scatter weight *inside free spins* (not implemented).
* Hit frequency 20.5% with small base pays (lowest cluster 0.02x): rounding to 2 decimals matters below the 0.20 minimum bet (RTP ~87% at 0.10). The server enforces the 0.20 minimum.
* Confidence intervals are +-1.2 points; a +-0.2 point claim needs ~30x more samples. Ante and buy were re-measured only once at final settings.
* A `game_controls` override for `wild-panther` in any database would supersede these defaults (UAT has none).
* The calibrator is stochastic; its output is a starting point, the validator is the authority.
