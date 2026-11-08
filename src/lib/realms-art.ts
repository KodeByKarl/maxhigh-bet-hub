import readyGames from "./realms-art-ready.json";

const ready: ReadonlySet<string> = new Set<string>(readyGames);
export function hasRegeneratedRealmsArt(id: string): boolean {
  return ready.has(id);
}
