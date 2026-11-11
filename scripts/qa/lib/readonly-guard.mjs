// Read-only network guard for browser QA (Playwright). Default-deny: nothing that could change state leaves the browser.
//
// Layers (none relies on matching words such as "buy" or "spin" in a URL or body):
//  1. Method: every request that is not GET or HEAD is aborted, whatever the URL or body (POST, PUT, PATCH, DELETE, beacons, form posts).
//  2. Server functions: a GET to /_serverFn/<id> is allowed only when <id> resolves, through the build's own id->name table, to a function
//     that the source declares as method GET with a get*/list* name. Unknown ids, and any non-read name, are aborted.
//  3. Smuggling: requests carrying X-HTTP-Method-Override / X-Method-Override, and every WebSocket, are refused; service workers are blocked
//     by the context options so no request can bypass the route handler.
// Every refusal is recorded. `report()` returns the blocked list; `assertNothingMutating()` additionally checks, from the browser's own view,
// that no non-GET request ever received a response.
import fs from "node:fs";
import path from "node:path";

/** Context options every guarded context must use (blocks service workers so they cannot route around the guard). */
export const GUARDED_CONTEXT_OPTIONS = { serviceWorkers: "block" };

/** id -> function name from a TanStack Start build output (server function manifest embedded in the SSR chunks). */
export function loadServerFnIds(ssrDir) {
  const map = new Map();
  for (const file of fs.readdirSync(ssrDir).filter((x) => x.endsWith(".mjs"))) {
    const text = fs.readFileSync(path.join(ssrDir, file), "utf8");
    for (const m of text.matchAll(/id:\s*"([a-f0-9]{64})",\s*name:\s*"([^"]+)"/g)) map.set(m[1], m[2]);
  }
  return map;
}

/** Names of server functions the source declares with method GET (read functions). */
export function readFunctionNamesFromSource(srcDir) {
  const names = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const s = fs.readFileSync(p, "utf8");
        for (const m of s.matchAll(/export const (\w+)\s*=\s*createServerFn\(\{\s*method:\s*"GET"/g)) names.add(m[1]);
      }
    }
  };
  walk(srcDir);
  return names;
}

export async function installReadOnlyGuard(context, { origins, idToName, readNames, allowThirdPartyGet = true }) {
  const blocked = [];
  const allowed = { page: 0, asset: 0, readRpc: 0, thirdParty: 0 };
  const origin = (u) => new URL(u).origin;
  const originSet = new Set(origins);
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    const method = req.method().toUpperCase();
    const headers = req.headers();
    const deny = (why) => {
      blocked.push({ method, url: url.slice(0, 160), why });
      return route.abort("blockedbyclient");
    };
    if (method !== "GET" && method !== "HEAD") return deny("non-GET method");
    if ("x-http-method-override" in headers || "x-method-override" in headers) return deny("method override header");
    let o;
    try {
      o = origin(url);
    } catch {
      return deny("unparseable url");
    }
    if (!originSet.has(o)) {
      if (!allowThirdPartyGet || !/^https:/.test(url)) return deny("third-party origin");
      allowed.thirdParty++;
      return route.continue();
    }
    const rpc = new URL(url).pathname.match(/^\/_serverFn\/([a-f0-9]{64})$/);
    if (rpc) {
      const name = idToName.get(rpc[1]);
      if (!name) return deny("unknown server function id");
      if (!readNames.has(name) || !/^(get|list)[A-Z]/.test(name)) return deny(`server function ${name} is not a declared read function`);
      allowed.readRpc++;
      return route.continue();
    }
    if (/^\/_serverFn\//.test(new URL(url).pathname)) return deny("malformed server function path");
    allowed[req.resourceType() === "document" ? "page" : "asset"]++;
    return route.continue();
  });
  // Sockets are never needed for read-only capture.
  if (typeof context.routeWebSocket === "function") {
    await context.routeWebSocket(/.*/, (ws) => {
      blocked.push({ method: "WS", url: ws.url().slice(0, 160), why: "websocket" });
      ws.close();
    });
  }
  // Independent observation from the browser itself: any non-GET request that got a response is a guard failure.
  const leaked = [];
  context.on("response", (res) => {
    const m = res.request().method().toUpperCase();
    if (m !== "GET" && m !== "HEAD") leaked.push(`${m} ${res.url().slice(0, 120)} -> ${res.status()}`);
  });
  return {
    blocked,
    allowed,
    leaked,
    report: () => ({ blocked: blocked.length, allowed: { ...allowed }, leaked: leaked.length }),
    assertNothingMutating() {
      if (leaked.length) throw new Error("READ-ONLY GUARD FAILURE, a mutating request received a response: " + leaked.join("; "));
    },
  };
}
