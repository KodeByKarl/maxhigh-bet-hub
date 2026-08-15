import {
  DEFAULT_FORTUNE_RABBIT_CONFIG,
  normalizeFortuneRabbitConfig,
  type FortuneRabbitConfig,
} from "@/lib/fortune-rabbit-config";

let current: FortuneRabbitConfig = structuredClone(DEFAULT_FORTUNE_RABBIT_CONFIG);

export function getFortuneRabbitConfig(): FortuneRabbitConfig {
  return current;
}

export function setFortuneRabbitConfig(raw: unknown) {
  current = normalizeFortuneRabbitConfig(raw);
  return current;
}
