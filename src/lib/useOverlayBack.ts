import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { openOverlay } from "@/lib/overlay-history";
import { installRoundGuard, roundInFlight } from "@/lib/round-guard";

/** Makes browser/Android Back close this overlay first. `guardRound` absorbs Back while a round request is in flight. */
export function useOverlayBack(open: boolean, onClose: () => void, guardRound = false) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    if (guardRound) installRoundGuard();
    const close = openOverlay({
      onBack: () => closeRef.current(),
      guard: guardRound ? roundInFlight : undefined,
      onGuarded: () =>
        toast.message("Round in progress", {
          description: "Please wait for the result, then go back.",
        }),
    });
    return close;
  }, [open, guardRound]);
}
