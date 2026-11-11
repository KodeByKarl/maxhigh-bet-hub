import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function validWebhookSecret(secret) {
  return (
    typeof secret === "string" && secret.length >= 32 && !/change.me|placeholder/i.test(secret)
  );
}
function same(a, b) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function createWebhookHandler({ secret, branch = "main", onTrigger, deliveryFile }) {
  if (!validWebhookSecret(secret)) throw Error("Webhook requires a strong configured secret");
  const deliveries = new Map(
    deliveryFile && fs.existsSync(deliveryFile)
      ? JSON.parse(fs.readFileSync(deliveryFile, "utf8"))
      : [],
  );
  let windowStart = Date.now(),
    requests = 0;
  return async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(body));
    };
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/health") return reply(200, { ok: true });
      if (req.method !== "POST" || !["/hooks/github", "/hooks/deploy"].includes(url.pathname))
        return reply(404, { error: "not found" });
      if (Date.now() - windowStart > 60000) {
        windowStart = Date.now();
        requests = 0;
      }
      if (++requests > 30) return reply(429, { error: "rate limited" });
      if (url.searchParams.has("token"))
        return reply(401, { error: "URL credentials are not accepted" });
      if (
        url.pathname === "/hooks/deploy" &&
        !same(String(req.headers.authorization ?? ""), `Bearer ${secret}`)
      )
        return reply(401, { error: "unauthorized" });
      const signature = String(req.headers["x-hub-signature-256"] ?? "");
      if (url.pathname === "/hooks/github" && !/^sha256=[a-f0-9]{64}$/.test(signature))
        return reply(401, { error: "signature required" });
      if (Number(req.headers["content-length"] ?? 0) > 65536)
        return reply(413, { error: "body too large" });
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 65536) return reply(413, { error: "body too large" });
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      if (url.pathname === "/hooks/github") {
        const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
        if (!same(signature, expected)) return reply(401, { error: "invalid signature" });
        const delivery = String(req.headers["x-github-delivery"] ?? "");
        if (!/^[a-zA-Z0-9-]{16,128}$/.test(delivery))
          return reply(400, { error: "delivery ID required" });
        const now = Date.now();
        for (const [id, time] of deliveries) if (now - time > 7 * 86400000) deliveries.delete(id);
        if (deliveries.has(delivery)) return reply(409, { error: "duplicate delivery" });
        if (deliveries.size >= 10000)
          return reply(503, { error: "delivery journal capacity reached" });
        const payload = JSON.parse(raw.toString("utf8") || "{}");
        const event = req.headers["x-github-event"];
        if (event !== "ping" && (event !== "push" || payload.ref !== `refs/heads/${branch}`))
          return reply(200, { ignored: true });
        deliveries.set(delivery, now);
        if (deliveryFile) {
          fs.mkdirSync(path.dirname(deliveryFile), { recursive: true });
          const temp = deliveryFile + ".tmp";
          fs.writeFileSync(temp, JSON.stringify([...deliveries]));
          fs.renameSync(temp, deliveryFile);
        }
        if (event === "ping") return reply(200, { pong: true });
      }
      await onTrigger();
      return reply(202, { accepted: true, action: "check-only" });
    } catch (error) {
      return reply(error instanceof SyntaxError ? 400 : 500, { error: "request rejected" });
    }
  };
}
