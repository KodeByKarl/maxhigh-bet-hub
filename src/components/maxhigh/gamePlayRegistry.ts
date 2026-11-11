/**
 * Lazy game engine registry for GamePlayModal.
 * Only the selected gameId is loaded; unknown IDs fall back to Coming Soon.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { isThumbnailOnlyGame } from "@/lib/playable-games";
import { REALMS_GAME_IDS } from "@/lib/realms/identity";
import { GAME_VIEW_LOADERS } from "@/games/registry";
import type { GamePlayProps } from "@/games/shared/types";

export type { GamePlayProps };

type LazyGame = LazyExoticComponent<ComponentType<GamePlayProps>>;

function lazyNamed<K extends string>(
  loader: () => Promise<Record<K, ComponentType<GamePlayProps>>>,
  exportName: K,
): LazyGame {
  return lazy(async () => {
    const mod = await loader();
    const Comp = mod[exportName];
    if (!Comp) throw new Error(`Missing export ${exportName}`);
    return { default: Comp };
  });
}

/**
 * Every catalogue game resolves to its own folder: src/games/<gameId>/GameView (generated map in src/games/registry.ts).
 * The legacy shells in this directory are still the game engines; each GameView wraps one with the game's own presentation.
 */
const GAME_LAZY: Record<string, LazyGame> = Object.fromEntries(
  Object.entries(GAME_VIEW_LOADERS).map(([id, loader]) => [id, lazyNamed(loader, "GameView")]),
);
for (const id of REALMS_GAME_IDS) {
  if (!GAME_LAZY[id]) throw new Error(`Realms game has no folder in src/games: ${id}`);
}

/**
 * Returns a lazy game component, or null for Coming Soon / thumbnail-only.
 * Synchronous lookup — no Suspense flash for unknown IDs.
 */
export function resolveLazyGame(gameId: string): LazyGame | null {
  if (isThumbnailOnlyGame(gameId)) return null;
  return GAME_LAZY[gameId] ?? null;
}

export function isRegisteredPlayableGame(gameId: string): boolean {
  return resolveLazyGame(gameId) != null;
}
