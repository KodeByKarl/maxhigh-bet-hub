import { getGameById } from "../src/lib/games";
import { isRegisteredPlayableGame } from "../src/components/maxhigh/gamePlayRegistry";
import { DEFAULT_JADE_JAGUAR_CONFIG } from "../src/lib/jade-jaguar-config";
import { DEFAULT_EMBER_TIGER_CONFIG } from "../src/lib/ember-tiger-config";
import { DEFAULT_LOTUS_LYNX_CONFIG } from "../src/lib/lotus-lynx-config";
import { DEFAULT_CORAL_COBRA_CONFIG } from "../src/lib/coral-cobra-config";
import { DEFAULT_FROST_FOX_CONFIG } from "../src/lib/frost-fox-config";
import { DEFAULT_SOLAR_SERPENT_CONFIG } from "../src/lib/solar-serpent-config";
import { DEFAULT_HONEY_HIVE_CONFIG } from "../src/lib/honey-hive-config";
import { DEFAULT_MIDNIGHT_OWL_CONFIG } from "../src/lib/midnight-owl-config";
import { DEFAULT_RUBY_RAVEN_CONFIG } from "../src/lib/ruby-raven-config";
import { getBuyUnitPrice, BUY_FS_START_BET } from "../src/components/maxhigh/jade-jaguar/paytable";

const IDS = [
  "jade-jaguar",
  "ember-tiger",
  "lotus-lynx",
  "coral-cobra",
  "frost-fox",
  "solar-serpent",
  "honey-hive",
  "midnight-owl",
  "ruby-raven",
] as const;

const configs = [
  DEFAULT_JADE_JAGUAR_CONFIG,
  DEFAULT_EMBER_TIGER_CONFIG,
  DEFAULT_LOTUS_LYNX_CONFIG,
  DEFAULT_CORAL_COBRA_CONFIG,
  DEFAULT_FROST_FOX_CONFIG,
  DEFAULT_SOLAR_SERPENT_CONFIG,
  DEFAULT_HONEY_HIVE_CONFIG,
  DEFAULT_MIDNIGHT_OWL_CONFIG,
  DEFAULT_RUBY_RAVEN_CONFIG,
];

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error("FAIL", msg);
  } else {
    console.log("ok ", msg);
  }
}

for (const id of IDS) {
  const g = getGameById(id);
  assert(!!g, `catalog ${id}`);
  assert(isRegisteredPlayableGame(id), `registry ${id}`);
}

for (const cfg of configs) {
  assert(cfg.buyFeatureMult === 42.5, `buy 42.5 ${cfg.schemaVersion}`);
  assert(cfg.superBuyFeatureMult === 212.5, `super 212.5`);
}

assert(BUY_FS_START_BET === 1, "start bet 1");
assert(getBuyUnitPrice(1, "normal") === 42.5, "price bet1 = 42.5");
assert(getBuyUnitPrice(2, "normal") === 85, "price bet2 = 85");
assert(getBuyUnitPrice(3, "normal") === 127.5, "price bet3 = 127.5");
assert(getBuyUnitPrice(10, "normal") === 425, "price bet10 = 425");
assert(+(getBuyUnitPrice(5, "normal") * 2).toFixed(2) === 425, "qty 2 at bet 5 = 425");

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll 9 Golden Panther clones smoke-checked.");
