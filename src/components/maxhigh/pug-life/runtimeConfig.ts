import {
  DEFAULT_PUG_LIFE_CONFIG,
  normalizePugLifeConfig,
  type PugLifeConfig,
} from "@/lib/pug-life-config";

let current: PugLifeConfig = structuredClone(DEFAULT_PUG_LIFE_CONFIG);

export function getPugLifeConfig(): PugLifeConfig {
  return current;
}

export function setPugLifeConfig(raw: unknown) {
  current = normalizePugLifeConfig(raw);
  return current;
}
