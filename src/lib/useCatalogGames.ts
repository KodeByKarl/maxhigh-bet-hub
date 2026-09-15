import { useEffect, useState } from "react";
import { getCatalogGamesFn } from "@/functions/superadmin";
import { slotGames, type SlotGame } from "@/lib/games";
import { isLobbyVisibleGame } from "@/lib/playable-games";

const visibleSlotGames = slotGames.filter((g) => isLobbyVisibleGame(g.id));

/** Casino lobby catalog — respects Superadmin enable/disable controls. */
export function useCatalogGames() {
  const [games, setGames] = useState<SlotGame[]>(visibleSlotGames);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCatalogGamesFn()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setGames((rows as SlotGame[]).filter((g) => isLobbyVisibleGame(g.id)));
        }
      })
      .catch(() => {
        /* keep static fallback */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { games, ready };
}
