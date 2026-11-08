/** Single cached public value, with one loader even during synchronized polls.
 * Never use for user/session/balance/authorization or financial mutation data. */
export function publicReadCache<T>(loader: () => Promise<T>, milliseconds: number) {
  let cached: { until: number; value: Promise<T> } | undefined;
  return () => {
    if (!cached || cached.until < Date.now()) {
      const value = loader();
      cached = { until: Date.now() + milliseconds, value };
      void value.catch(() => {
        if (cached?.value === value) cached = undefined;
      });
    }
    return cached.value;
  };
}
