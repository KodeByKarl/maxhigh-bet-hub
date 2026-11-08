import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import mysql from "mysql2/promise";
import { toJSONAsync, fromCrossJSON } from "seroval";

assert.equal(
  process.env.MYSQL_DATABASE,
  "maxhigh_demo",
  "This login check is limited to the local demo.",
);
const base = "http://localhost:8080";
const source = await (
  await fetch(`${base}/src/functions/api.ts`, { signal: AbortSignal.timeout(30000) })
).text();
function functionId(name) {
  const line = source.split("\n").find((line) => line.startsWith(`export const ${name} =`));
  const id = line?.match(/createClientRpc\("([^"]+)"\)/)?.[1];
  assert(id, `Cannot locate ${name} in the local development RPC bridge`);
  return id;
}
const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
const id = randomUUID();
const username = `qa_login_${randomBytes(5).toString("hex")}`;
const password = randomBytes(24).toString("hex");
let cookie;
async function call(name, method, data) {
  const headers = new Headers({
    Origin: base,
    Accept: "application/json",
    "x-tsr-serverFn": "true",
  });
  if (cookie) headers.set("Cookie", cookie);
  let body;
  if (data !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(await toJSONAsync({ data }));
  }
  const response = await fetch(`${base}/_serverFn/${functionId(name)}`, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(30000),
  });
  const session = response.headers.getSetCookie().find((value) => value.startsWith("mh_session="));
  if (session) cookie = session.split(";")[0];
  assert(
    response.headers.get("content-type")?.includes("application/json"),
    "Expected an RPC JSON response",
  );
  const json = await response.json();
  const result = response.headers.has("x-tss-serialized") ? fromCrossJSON(json, {}) : json;
  assert(!result.error, "The login API returned an error");
  return result;
}
try {
  await db.execute(
    "INSERT INTO users (id, public_user_id, username, password_hash, balance, role, display_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, username, username, await hash(password, 10), "0.00", "player", "Temporary sign-in check"],
  );
  const login = await call("loginFn", "POST", { username, password });
  const signedIn = login.result ?? login;
  assert.equal(signedIn.username, username);
  assert(cookie?.startsWith("mh_session="));
  const session = await call("getSessionFn", "GET");
  assert.equal((session.result ?? session).id, id);
  await call("logoutFn", "POST");
  const result = {
    databaseConnected: true,
    httpLogin: true,
    sessionCookie: true,
    authenticatedSession: true,
    logout: true,
    testedWithTemporaryAccount: true,
    existingPlayerSessionsUntouched: true,
  };
  fs.mkdirSync("output/database-demo", { recursive: true });
  fs.writeFileSync(
    "output/database-demo/http-login-verification.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await db.execute("DELETE FROM sessions WHERE user_id = ?", [id]);
  await db.execute("DELETE FROM users WHERE id = ?", [id]);
  await db.end();
}
