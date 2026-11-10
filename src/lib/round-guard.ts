/**
 * Tracks in-flight server-function POSTs (spins, deals, shots, settlements). While one is pending the player is mid-round:
 * Back is absorbed and closing the tab asks for confirmation. Money is always settled on the server; this only protects the
 * player from losing sight of a result that is being delivered. Idempotent installation.
 */
let pending = 0;
let installed = false;

export function installRoundGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (
      init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")
    ).toUpperCase();
    const tracked = method === "POST" && url.includes("/_serverFn/");
    if (!tracked) return original(input, init);
    pending++;
    return original(input, init).finally(() => {
      pending = Math.max(0, pending - 1);
    });
  };
  window.addEventListener("beforeunload", (e) => {
    if (pending > 0) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

export const roundInFlight = () => pending > 0;
