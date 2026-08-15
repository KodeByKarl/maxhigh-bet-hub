/**
 * Deep Bass RTP / unit simulation.
 * Run: npx tsx scripts/test-deep-bass.ts
 *
 * Simulates continuous shots against spawn-weighted fish (excludes live boss room),
 * reports empirical RTP vs 95.5–96.5% target band.
 */
import {
  DEFAULT_DEEP_BASS_CONFIG,
  RTP_REFERENCE,
  avgHits,
  avgPayoutMult,
  effectiveHitChance,
  normalizeDeepBassConfig,
  theoreticalFishRtp,
  type FishTierId,
} from "../src/lib/deep-bass-config";
import { resolveShot } from "../src/components/maxhigh/games/deep-bass/hitResolver";
import {
  createSpawnedFish,
  pickSpawnTier,
  rollHitsRequired,
  rollPayoutMult,
} from "../src/components/maxhigh/games/deep-bass/fishSpawner";
import { createRng } from "../src/components/maxhigh/games/deep-bass/rng";
import { setDeepBassConfig } from "../src/components/maxhigh/games/deep-bass/runtimeConfig";
import {
  createBossPool,
  applyBossHit,
  splitBossPayout,
  bossPotFromKill,
} from "../src/components/maxhigh/games/deep-bass/bossEngine";

const SHOTS = Number(process.env.DB_SIM_SHOTS ?? 200_000);
const WEAPON_ID = (process.env.DB_SIM_WEAPON ?? "trolling") as
  | "bamboo"
  | "spinning"
  | "trolling"
  | "harpoon"
  | "master";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function runUnitTests() {
  const cfg = normalizeDeepBassConfig(DEFAULT_DEEP_BASS_CONFIG);
  setDeepBassConfig(cfg);

  // Normalize clamps
  const bad = normalizeDeepBassConfig({
    rtpTarget: 200,
    maxHitChance: 2,
    fishTiers: [{ id: "common", baseHitChance: -1, payoutMin: 50, payoutMax: 1 }],
  });
  assert(bad.rtpTarget <= 99.5, "rtp clamp");
  assert(bad.maxHitChance <= 1, "hit cap clamp");
  const common = bad.fishTiers.find((f) => f.id === "common")!;
  assert(common.payoutMax >= common.payoutMin, "payout order");
  assert(common.baseHitChance >= 0.01, "hit chance floor");

  // Shot miss / hit shapes
  let hitSeen = false;
  let missSeen = false;
  for (let i = 0; i < 500; i++) {
    const r = resolveShot({
      weaponId: "bamboo",
      target: {
        instanceId: `t-${i}`,
        tierId: "common",
        hitsTaken: 0,
        hitsRequired: 1,
        payoutMult: 2,
      },
      seed: `unit-hit-${i}`,
      cfg,
    });
    if (r.hit) hitSeen = true;
    else missSeen = true;
    if (r.hit && r.killed) {
      assert(r.credit === +(r.betCost * 2).toFixed(2), "common kill credit");
    }
  }
  assert(hitSeen && missSeen, "expect both hits and misses");

  // Crate drop produces result
  let crateOk = false;
  for (let i = 0; i < 200; i++) {
    const r = resolveShot({
      weaponId: "bamboo",
      target: {
        instanceId: `c-${i}`,
        tierId: "crate",
        hitsTaken: 0,
        hitsRequired: 1,
        payoutMult: 0,
      },
      forceHit: true,
      seed: `crate-${i}`,
      cfg,
    });
    if (r.killed && r.crateDrop) {
      crateOk = true;
      break;
    }
  }
  assert(crateOk, "crate drop");

  // Boss split solo = 100%
  const rng = createRng("boss-unit");
  const pool = createBossPool({ cfg, rng });
  applyBossHit({ pool, userId: "u1", username: "alice" });
  pool.fish.hitsTaken = pool.fish.hitsRequired;
  pool.killed = true;
  const shares = splitBossPayout({
    boss: cfg.boss,
    pool,
    finisherUserId: "u1",
    totalPot: 1000,
  });
  assert(shares.length === 1 && shares[0]!.credit === 1000, "solo boss pot");

  // Multi contributor split
  const pool2 = createBossPool({ cfg, rng: createRng("boss-multi") });
  applyBossHit({ pool: pool2, userId: "a", username: "a" });
  applyBossHit({ pool: pool2, userId: "a", username: "a" });
  applyBossHit({ pool: pool2, userId: "b", username: "b" });
  pool2.killed = true;
  const pot = bossPotFromKill({ cfg, betCost: 10, payoutMult: 100 });
  const multi = splitBossPayout({
    boss: cfg.boss,
    pool: pool2,
    finisherUserId: "b",
    totalPot: pot,
  });
  const sum = +multi.reduce((s, x) => s + x.credit, 0).toFixed(2);
  assert(Math.abs(sum - pot) < 0.02, `boss split sums to pot (${sum} vs ${pot})`);
  const fin = multi.find((s) => s.isFinisher)!;
  assert(
    Math.abs(fin.credit - +(pot * cfg.boss.finisherShare).toFixed(2)) < 0.02,
    "finisher share",
  );

  console.log("✓ unit tests passed");
}

function runTheoretical() {
  const cfg = normalizeDeepBassConfig(DEFAULT_DEEP_BASS_CONFIG);
  const weapon = cfg.weapons.find((w) => w.id === WEAPON_ID)!;
  console.log("\nTheoretical RTP by fish (weapon=%s):", weapon.id);
  let weightSum = 0;
  let weighted = 0;
  for (const fish of cfg.fishTiers) {
    if (fish.id === "boss" || fish.id === "crate" || fish.spawnWeight <= 0) continue;
    const rtp = theoreticalFishRtp(fish, weapon, cfg.maxHitChance) * 100;
    console.log(
      `  ${fish.id.padEnd(10)} E[m]=${avgPayoutMult(fish).toFixed(2)} H=${avgHits(fish).toFixed(2)} p=${effectiveHitChance(fish, weapon, cfg.maxHitChance).toFixed(3)} → ${rtp.toFixed(2)}% (w=${fish.spawnWeight})`,
    );
    weightSum += fish.spawnWeight;
    weighted += rtp * fish.spawnWeight;
  }
  console.log(`  weighted (no crate/boss): ${(weighted / weightSum).toFixed(2)}%`);
}

function runRtpSimulation() {
  const cfg = normalizeDeepBassConfig(DEFAULT_DEEP_BASS_CONFIG);
  setDeepBassConfig(cfg);
  const weapon = cfg.weapons.find((w) => w.id === WEAPON_ID)!;

  // Track HP state per "virtual" fish life — spawn a fish, shoot until dead, repeat.
  let wagered = 0;
  let paid = 0;
  let kills = 0;
  let shots = 0;
  const killByTier: Partial<Record<FishTierId, number>> = {};

  const masterRng = createRng(`rtp-master-${SHOTS}`);

  while (shots < SHOTS) {
    // Pick a fish life (skip boss; include crate with spawn weight)
    const spawnRng = createRng(`spawn-${shots}-${masterRng.nextInt(1e9)}`);
    const tierId = pickSpawnTier(cfg, spawnRng);
    const fish = createSpawnedFish({ cfg, rng: spawnRng, tierId });

    while (fish.hitsTaken < fish.hitsRequired && shots < SHOTS) {
      const shotRng = createRng(`shot-${shots}`);
      const result = resolveShot({
        weaponId: weapon.id,
        target: {
          instanceId: fish.instanceId,
          tierId: fish.tierId,
          hitsTaken: fish.hitsTaken,
          hitsRequired: fish.hitsRequired,
          payoutMult: fish.payoutMult,
        },
        seed: shotRng.seed,
        cfg,
        rng: shotRng,
      });
      wagered += result.betCost;
      shots += 1;
      if (result.hit) {
        fish.hitsTaken = result.hitsTaken;
      }
      if (result.killed) {
        paid += result.credit;
        kills += 1;
        killByTier[tierId] = (killByTier[tierId] ?? 0) + 1;
        break;
      }
    }
  }

  const rtp = wagered > 0 ? (paid / wagered) * 100 : 0;
  console.log("\nRTP simulation");
  console.log(`  shots=${shots} weapon=${weapon.id} bet=${weapon.betCost}`);
  console.log(`  wagered=₱${wagered.toFixed(2)} paid=₱${paid.toFixed(2)}`);
  console.log(`  kills=${kills} byTier=`, killByTier);
  console.log(`  RTP=${rtp.toFixed(3)}%  target=${cfg.rtpTarget}%  band=${RTP_REFERENCE.min}–${RTP_REFERENCE.max}%`);

  // Allow slight monte-carlo noise; hard fail outside 90–102
  assert(rtp >= 90 && rtp <= 102, `RTP out of sanity range: ${rtp}`);
  if (rtp < RTP_REFERENCE.min || rtp > RTP_REFERENCE.max) {
    console.warn(
      `⚠ RTP ${rtp.toFixed(2)}% outside target band ${RTP_REFERENCE.min}–${RTP_REFERENCE.max}% (may need tuning; still within sanity gate)`,
    );
  } else {
    console.log("✓ RTP within target band");
  }

  // Sanity: spawn helpers produce valid ranges
  for (let i = 0; i < 50; i++) {
    const rng = createRng(`shape-${i}`);
    const tier = pickSpawnTier(cfg, rng);
    const h = rollHitsRequired(tier, cfg, rng);
    const m = rollPayoutMult(tier, cfg, rng);
    const fishCfg = cfg.fishTiers.find((f) => f.id === tier)!;
    assert(h >= fishCfg.hitsMin && h <= fishCfg.hitsMax, "hits range");
    if (tier !== "crate") {
      assert(m >= fishCfg.payoutMin && m <= fishCfg.payoutMax, "payout range");
    }
  }
  console.log("✓ spawn shape checks passed");
}

function main() {
  runUnitTests();
  runTheoretical();
  runRtpSimulation();
  console.log("\nDeep Bass tests complete.");
}

main();
