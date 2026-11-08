import { createMiddleware } from "@tanstack/react-start";

const pending = new Map<string, { key: string; at: number }>();
/** Concurrent submissions and uncertain network retries share a durable browser intent. */
export const operationIdentity = createMiddleware({ type: "function" }).client(
  async ({ next, fetch: suppliedFetch, data, serverFnMeta }) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify({ id: serverFnMeta.id, data })),
    );
    const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const storageKey = `maxhigh.intent.${fingerprint}`;
    let intent = pending.get(fingerprint);
    try {
      intent ??= JSON.parse(sessionStorage.getItem(storageKey) ?? "null") ?? undefined;
    } catch {
      /* storage may be disabled */
    }
    if (!intent || Date.now() - intent.at > 24 * 60 * 60 * 1000)
      intent = { key: crypto.randomUUID(), at: Date.now() };
    const key = intent.key;
    pending.set(fingerprint, intent);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(intent));
    } catch {
      /* memory fallback */
    }
    let networkFailed = false;
    const clear = () => {
      pending.delete(fingerprint);
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* memory fallback */
      }
    };
    try {
      const result = await next({
        fetch: (url, options) => {
          const headers = new Headers(options?.headers);
          if (!headers.has("Idempotency-Key")) headers.set("Idempotency-Key", key);
          return (suppliedFetch ?? fetch)(url, { ...options, headers }).catch((error) => {
            networkFailed = true;
            throw error;
          });
        },
      });
      clear();
      return result;
    } catch (error) {
      const retryableServiceFailure =
        error instanceof Error &&
        /Financial service unavailable|retry with the same operation key|temporarily unavailable|Database is draining|HTTP\s*(502|503|504)/i.test(
          error.message,
        );
      if (
        !networkFailed &&
        !retryableServiceFailure &&
        !(error instanceof TypeError) &&
        !(error instanceof Error && error.name === "AbortError")
      )
        clear();
      throw error;
    }
  },
);
