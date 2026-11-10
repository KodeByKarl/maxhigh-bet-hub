import { useEffect, useState } from "react";
import { getAccessStatusFn } from "@/functions/access";

export type AccessStatus = { lockedGames: string[]; message: string | null };
const EMPTY: AccessStatus = { lockedGames: [], message: null };

let inflight: Promise<AccessStatus> | null = null;
let loadedAt = 0;
let current: AccessStatus = EMPTY;

function load(): Promise<AccessStatus> {
  if (inflight && Date.now() - loadedAt < 30_000) return inflight;
  loadedAt = Date.now();
  inflight = getAccessStatusFn()
    .then((r) => (current = r as AccessStatus))
    .catch(() => current); // a failed lookup never blocks the lobby; the SERVER still enforces every lock
  return inflight;
}

/** Display-only view of locked games. Security is enforced on the server for every wager; this only tells the player. */
export function useAccessStatus() {
  const [status, setStatus] = useState<AccessStatus>(current);
  useEffect(() => {
    let cancelled = false;
    void load().then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);
  return { isLocked: (id: string) => status.lockedGames.includes(id), message: status.message };
}
