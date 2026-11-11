import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, randomInt } from "node:crypto";

export type RoundRandom = {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  draws: number;
  effectiveConfig?: unknown;
};
export const roundRandom = new AsyncLocalStorage<RoundRandom>();
export function recordRoundConfig<T>(value: T): T {
  const state = roundRandom.getStore();
  if (state) state.effectiveConfig = structuredClone(value);
  return value;
}
(globalThis as typeof globalThis & { __maxhighRandom?: () => number }).__maxhighRandom = () => {
  const state = roundRandom.getStore();
  if (!state) return randomInt(0, 4294967296) / 4294967296;
  const bytes = createHmac("sha256", state.serverSeed)
    .update(`${state.clientSeed}:${state.nonce}:${state.draws++}`)
    .digest();
  return bytes.readUInt32BE(0) / 4294967296;
};

(globalThis as typeof globalThis & { __maxhighRoundActive?: () => boolean }).__maxhighRoundActive =
  () => !!roundRandom.getStore();
