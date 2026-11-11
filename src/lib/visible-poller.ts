/** One request per subscription; hidden/unmounted views never schedule more work. */
export function startVisiblePolling(
  task: (active: () => boolean) => Promise<unknown>,
  intervalMs: number,
  options: { immediate?: boolean } = {},
) {
  let stopped = false,
    running = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const active = () => !stopped && !document.hidden;
  const schedule = (delay: number) => {
    if (active() && !running) timer = setTimeout(() => void run(), delay);
  };
  const run = async () => {
    timer = undefined;
    if (!active() || running) return;
    running = true;
    try {
      await task(active);
    } catch {
      /* caller can present errors; polling remains bounded */
    } finally {
      running = false;
      schedule(intervalMs);
    }
  };
  const visibility = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (active()) schedule(250);
  };
  document.addEventListener("visibilitychange", visibility);
  if (options.immediate !== false) void run();
  else schedule(intervalMs);
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", visibility);
  };
}
