import { useEffect, useState } from "react";
import { getCatalogGamesFn } from "@/functions/superadmin";
import { slotGames, type SlotGame } from "@/lib/games";

/** Casino lobby catalog — respects Superadmin enable/disable controls. */
export function useCatalogGames() {
  const [games, setGames] = useState<SlotGame[]>(slotGames);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCatalogGamesFn()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setGames(rows as SlotGame[]);
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
