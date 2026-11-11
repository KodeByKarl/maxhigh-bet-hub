# UAT stabilization release: ready for approval (NOT deployed)

Branch `uat/stabilization-20261111`, built from the deployed integration revision `0b58e6e`.
**Artifact commit: `3e1a42454b15e06eed61f3d476df84d9e01ccb82`** (CI run 43000509615, branch `ci/staging-artifact-uat-stabilization-20261111`, Linux x64, Node 24.22.2).
`release.tgz` SHA-256 `f75c3ae06fa2d64f495820aece3842655710d668adbc7cd2491f7c2731746e19`; manifest SHA-256 `f1ef4b338ad6bf7752717d9d5ca6a910a7dd2190aa118406ab1e8ea19fd239bf`.
Commits after `3e1a424` add only `deploy/` scripts and docs (no source change).

## What changed vs 0b58e6e
- `src/lib/buy-bonus.ts`: exact decimal arithmetic (no binary float ties), one half-up rounding to the centavo; new `buyBonusUnitPriceText` (true-precision unit price).
- `src/components/maxhigh/buy-bonus/BuyBonusModal.tsx`: shows the exact unit price (e.g. 265.625) and a two-decimal total.
- `src/server/games/wild-panther.server.ts`: buy cost uses the same exact arithmetic (still bet x calibrated multiplier, still locked at 10 free spins).
- `src/components/maxhigh/games/{baccarat/BettingPanel,color-game/ColorGameTable,shark-hunter/SharkHunterGame,fishing-shared/FishingSeabed}.tsx`: presentation fixes only.
- `scripts/`: pricing regression tests, verified read-only browser guard, guarded capture.
No schema, migration, lock/allocation, registry, auth or env change. The 50/50 allocation is untouched.

## Charge impact
Charged totals follow each game's own multiplier exactly as before; the only difference is a single exact half-up rounding instead of floating-point `toFixed`, which can differ by at most 1 centavo in rare tie cases. The server prices every purchase itself; the request carries only bet, mode and quantity.

## Deploy (operator; needs the SSH key and sudo; same procedure as 0b58e6e)
```powershell
$k="$env:USERPROFILE\.ssh\maxhigh_vps2"; $d="maxhigh-ops@151.242.136.34"
ssh -i $k $d "mkdir -p ~/maxhigh-release-3e1a424"
# from the folder holding the downloaded CI artifact (release.tgz, SHA256SUMS, metadata.json, safe-extract.py) plus deploy\uat\upgrade-uat2.sh and rollback-uat2.sh:
scp -i $k release.tgz SHA256SUMS metadata.json safe-extract.py upgrade-uat2.sh rollback-uat2.sh "${d}:maxhigh-release-3e1a424/"
ssh -i $k $d "cd ~/maxhigh-release-3e1a424 && sed -i 's/\r$//' *.sh && sha256sum -c SHA256SUMS"
ssh -t -i $k $d "sudo sh ~/maxhigh-release-3e1a424/upgrade-uat2.sh 3e1a42454b15e06eed61f3d476df84d9e01ccb82 f75c3ae06fa2d64f495820aece3842655710d668adbc7cd2491f7c2731746e19 f1ef4b338ad6bf7752717d9d5ca6a910a7dd2190aa118406ab1e8ea19fd239bf"
```
The script backs up and restore-tests the database, upgrades only `maxhigh-uat2`, health-checks `/api/health` for the new SHA, and reverts automatically on failure.
Rollback: `sudo sh ~/maxhigh-release-3e1a424/rollback-uat2.sh`.
Afterwards verify with the read-only guarded browser checks (`scripts/qa/lib/readonly-guard.mjs`); do not click Buy & Play without the guard.
