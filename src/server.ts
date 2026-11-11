import { randomBytes } from "node:crypto";
import { admitRequest, finishRequest } from "./server/lifecycle.server";
import { secureResponse } from "./server/security-headers.server";
import { stagingPreviewResponse } from "./server/staging-preview.server";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const nonce = randomBytes(18).toString("base64");
    const preview = stagingPreviewResponse(request);
    if (preview) return secureResponse(preview, nonce);
    if (!admitRequest())
      return secureResponse(
        new Response("Service temporarily unavailable", {
          status: 503,
          headers: { "Retry-After": "1" },
        }),
        nonce,
      );
    const headers = new Headers(request.headers);
    headers.set("x-maxhigh-csp-nonce", nonce);
    try {
      // Nitro's incoming Request can use a different constructor from Node's global.
      // Copy fields explicitly rather than coercing a cross-implementation Request to a URL.
      request = new Request(request.url, {
        method: request.method,
        headers,
        ...(request.method === "GET" || request.method === "HEAD"
          ? {}
          : { body: request.body, duplex: "half" }),
      } as RequestInit);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return secureResponse(await normalizeCatastrophicSsrResponse(response), nonce);
    } catch (error) {
      console.error(error);
      return secureResponse(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        nonce,
      );
    } finally {
      finishRequest();
    }
  },
};
