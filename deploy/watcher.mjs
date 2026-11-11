import http from "node:http";
import { pathToFileURL } from "node:url";
import { createWebhookHandler } from "./webhook.server.mjs";
import { checkUpdateStatus } from "./release-manager.mjs";
export { createWebhookHandler, validWebhookSecret } from "./webhook.server.mjs";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await import("dotenv/config");
  let checking = false;
  const check = async () => {
    if (checking) return;
    checking = true;
    try {
      const status = await checkUpdateStatus();
      console.log(JSON.stringify({ updatesAvailable: status.behind }));
    } catch {
      console.error("Update check failed");
    } finally {
      checking = false;
    }
  };
  if (process.env.DEPLOY_WEBHOOK_ENABLED === "1") {
    const handler = createWebhookHandler({
      secret: process.env.DEPLOY_WEBHOOK_SECRET,
      branch: process.env.DEPLOY_BRANCH ?? "main",
      onTrigger: check,
      deliveryFile: "deploy/logs/webhook-deliveries.json",
    });
    http
      .createServer({ requestTimeout: 10000, headersTimeout: 10000, maxHeaderSize: 16384 }, handler)
      .listen(Number(process.env.DEPLOY_WEBHOOK_PORT ?? 9090), "127.0.0.1");
  }
  void check();
  setInterval(
    () => void check(),
    Math.max(30, Number(process.env.DEPLOY_POLL_SECONDS ?? 90)) * 1000,
  );
}
