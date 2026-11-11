// DEVELOPER tool: sign an entitlement grant with an Ed25519 PRIVATE key that lives OUTSIDE the repository and OUTSIDE the VPS.
// Prints the three values to paste into the superadmin "apply grant" flow: payload, signature, keyId. Signs nothing by default.
//   node scripts/dev/sign-entitlement-grant.mjs --key <private.pem> --key-id <id> --kind unlock-games --games a,b,c [--expires 2026-12-31T00:00:00Z]
//   node scripts/dev/sign-entitlement-grant.mjs --key <private.pem> --key-id <id> --kind lift-client-cap --max 5
//   node scripts/dev/sign-entitlement-grant.mjs --key <private.pem> --key-id <id> --kind authorize-exempt-account --username qa_helper --class qa
// The environment is fixed to the one compiled into the build (default "uat"); a grant for another environment is rejected by the server.
import fs from "node:fs";
import path from "node:path";
import { randomBytes, createPrivateKey, sign } from "node:crypto";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const need = (n) => { const v = opt(n); if (!v) throw new Error(`--${n} is required`); return v; };
const keyFile = need("key"), keyId = need("key-id"), kind = need("kind");
if (path.resolve(keyFile).toLowerCase().startsWith(path.resolve(".").toLowerCase())) throw new Error("the private key must live outside the repository");
const payload = { v: 1, kind, environment: opt("environment") ?? "uat", nonce: randomBytes(16).toString("hex"), issuedAt: new Date().toISOString() };
if (opt("expires")) payload.expiresAt = new Date(opt("expires")).toISOString();
if (kind === "unlock-games") payload.games = need("games").split(",").map((s) => s.trim()).filter(Boolean);
else if (kind === "lift-client-cap") payload.maxClientAccounts = Number(need("max"));
else if (kind === "authorize-exempt-account") { payload.username = need("username"); payload.accountClass = need("class"); }
else throw new Error("unknown kind");
const text = JSON.stringify(payload);
const signature = sign(null, Buffer.from(text, "utf8"), createPrivateKey(fs.readFileSync(keyFile))).toString("base64");
console.log(JSON.stringify({ keyId, payload: text, signature }, null, 1));
console.error("Review the payload before applying. A grant is single-use (nonce) and is recorded in the audit log when applied.");
