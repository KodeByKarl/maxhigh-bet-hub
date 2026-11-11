/**
 * Back-button support for full-screen overlays (info modal, game shell).
 *
 * Browser/Android Back should close the TOP overlay first and never leave the page by accident:
 *  - opening an overlay pushes exactly one history entry (same URL, router state preserved);
 *  - Back (popstate) closes the topmost overlay; closing by the UI removes our entry again (no duplicate entries, no loops);
 *  - if a guard says a round is in flight, Back is absorbed (the entry is re-pushed) and the player is told to wait.
 * This is browser history only. It cannot and does not change Android's own system navigation bar or gestures.
 */
type Entry = { id: string; onBack: () => void; guard?: () => boolean; onGuarded?: () => void };
const stack: Entry[] = [];
let ignorePops = 0;
let listening = false;
let seq = 0;

function onPop() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  const top = stack[stack.length - 1];
  if (!top) return;
  if (top.guard?.()) {
    // The browser already consumed our entry: put it back so the overlay (and the session) stay where they are.
    history.pushState({ ...(history.state ?? {}), mhOverlay: top.id }, "", location.href);
    top.onGuarded?.();
    return;
  }
  stack.pop();
  top.onBack();
}

/** Registers an overlay. Returns the programmatic close function (call it when the overlay closes by any other means). */
export function openOverlay(opts: Omit<Entry, "id">): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (!listening) {
    window.addEventListener("popstate", onPop);
    listening = true;
  }
  const entry: Entry = { ...opts, id: `mh-overlay-${++seq}` };
  history.pushState({ ...(history.state ?? {}), mhOverlay: entry.id }, "", location.href);
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i === -1) return; // already closed through Back
    stack.splice(i, 1);
    // Only unwind our own entry, and only while it is still the current one (never after the player navigated elsewhere).
    if (history.state?.mhOverlay === entry.id) {
      ignorePops++;
      history.back();
    }
  };
}

export const __overlayStackDepthForTests = () => stack.length;
