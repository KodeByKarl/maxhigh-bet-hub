type RandomProvider = () => number;
const runtime = globalThis as typeof globalThis & {
  __maxhighRandom?: RandomProvider;
  __maxhighRoundActive?: () => boolean;
};

/** Server installs an async-context provider; browsers use WebCrypto. */
export function gameRandom(): number {
  if (runtime.__maxhighRandom) return runtime.__maxhighRandom();
  const words = new Uint32Array(1);
  crypto.getRandomValues(words);
  return words[0] / 4294967296;
}

export function hasRoundRandom(): boolean {
  return typeof window === "undefined" && !!runtime.__maxhighRoundActive?.();
}
