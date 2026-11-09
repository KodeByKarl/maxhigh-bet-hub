// MaxHigh UAT QA client (synthetic accounts only). Talks to the UAT app ONLY through a loopback SSH tunnel.
// - refuses any base URL that is not 127.0.0.1/localhost
// - credentials are read from a private file outside the repository and are never printed or logged
// - one login attempt per account per run (failed logins can trip the UAT rate limiter / fail2ban)
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { toJSONAsync, fromCrossJSON } from "seroval";
import { createDefaultSerovalPlugins } from "@tanstack/router-core/ssr/client";

export const BASE = process.env.UAT_BASE ?? "http://127.0.0.1:18080";
const host = new URL(BASE).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) throw new Error("Refusing: QA client only talks to a loopback tunnel to UAT");
export const ORIGIN = process.env.UAT_ORIGIN ?? BASE;
const CREDS = process.env.UAT_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\uat-final-credentials.txt";

// Server-function ids come from the build output (deterministic from source paths); a mismatch shows up as an HTTP error.
const ids = new Map();
const ssrDir = path.resolve(process.env.UAT_BUILD_DIR ?? ".output/server/_ssr");
for (const file of fs.readdirSync(ssrDir).filter((x) => x.endsWith(".mjs"))) {
  const text = fs.readFileSync(path.join(ssrDir, file), "utf8");
  for (const m of text.matchAll(/id:\s*"([a-f0-9]{64})",\s*name:\s*"([^"]+)"/g)) ids.set(m[2], m[1]);
}
export const knownFunctions = () => [...ids.keys()];

const QA_CREDS = process.env.UAT_QA_CREDS_FILE ?? "C:\\Users\\Keydi\\maxhigh-uat-secrets\\uat-qa-credentials.txt";
export function credentialsFor(username) {
  for (const file of [CREDS, QA_CREDS]) {
    if (!fs.existsSync(file)) continue;
    const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.split("\t")[0] === username);
    if (line) return line.split("\t")[2];
  }
  throw new Error(`No credentials for ${username} in the private files`);
}

export class RpcRejection extends Error {}

export class Client {
  constructor() { this.cookie = null; this.who = null; }
  async rpc(name, data, { method = "POST", key = randomUUID(), origin, site } = {}) {
    if (!ids.has(name)) throw new Error(`Unknown server function ${name} (not in the build output)`);
    const headers = { "content-type": "application/json", accept: "application/json", "x-tsr-serverFn": "true", Origin: origin ?? ORIGIN, "Sec-Fetch-Site": site ?? "same-origin", "Idempotency-Key": key };
    if (this.cookie) headers.Cookie = `mh_session=${this.cookie}`;
    if (site === null) delete headers["Sec-Fetch-Site"];
    const payload = JSON.stringify(await toJSONAsync({ data }));
    const url = BASE + "/_serverFn/" + ids.get(name) + (method === "GET" ? "?payload=" + encodeURIComponent(payload) : "");
    const response = await fetch(url, { method, headers, body: method === "POST" ? payload : undefined });
    const text = await response.text();
    let decoded;
    try { decoded = fromCrossJSON(JSON.parse(text), { plugins: createDefaultSerovalPlugins() }); }
    catch { throw new Error(`RPC ${name}: HTTP ${response.status}, undecodable body (${text.slice(0, 160).replace(/\s+/g, " ")})`); }
    const setCookie = response.headers.getSetCookie?.() ?? [];
    for (const c of setCookie) { const m = /^mh_session=([^;]*)/.exec(c); if (m) this.cookie = m[1] || null; }
    if (decoded?.error) throw new RpcRejection(decoded.error.message ?? String(decoded.error));
    if (!response.ok) throw new Error(`RPC ${name}: HTTP ${response.status}`);
    return decoded?.result;
  }
  async login(username) {
    const password = credentialsFor(username);
    const result = await this.rpc("loginFn", { username, password });
    if (!this.cookie) throw new Error("login returned no session cookie");
    this.who = username;
    return result;
  }
  async logout() { try { await this.rpc("logoutFn", {}); } finally { this.cookie = null; } }
  balance = async () => Number((await this.rpc("getBalanceFn", undefined, { method: "GET" }))?.balance ?? NaN);
}

export const health = async () => (await fetch(BASE + "/api/health")).json();
