// One controlled synthetic-credit smoke spin on UAT (through the loopback tunnel). Prints no secrets.
import { Client, health, knownFunctions } from "./uat-client.mjs";

const user = process.env.UAT_USER ?? "uat_player";
const bet = Number(process.env.UAT_BET ?? 1);
const report = [];
const say = (k, v) => { report.push([k, v]); console.log(`${k.padEnd(34)} ${typeof v === "string" ? v : JSON.stringify(v)}`); };

const h = await health();
say("health", h);
if (!h.ok || !String(h.release).startsWith("2294d79")) throw new Error("UAT health/release unexpected - stopping");
say("server functions in local build", knownFunctions().length);

const c = new Client();
const session = await c.login(user);          // exactly one login attempt
say("login", { user, ok: true, keys: Object.keys(session ?? {}) });
const before = await c.balance();
say("balance before", before);
if (!(before >= bet)) throw new Error("insufficient synthetic credit for the smoke bet");

const idsBefore = new Set((await c.rpc("listMyTransactionsFn", { tab: "all", limit: 300 }, { method: "GET" }).then((r) => (Array.isArray(r) ? r : r?.rows ?? []))).map((r) => r.id));
let result, error = null;
try { result = await c.rpc("goldenPantherSpinFn", { bet, ante: false }); } catch (e) { error = e.message; }
const after = await c.balance();
say("balance after", after);
if (error) {
  say("spin ERROR", error);
  say("balance unchanged after error", after === before);
  await c.logout();
  process.exit(1);
}
const nums = Object.fromEntries(Object.entries(result ?? {}).filter(([k, v]) => typeof v === "number" && /win|payout|bet|total|balance|mult/i.test(k)));
say("spin result (numeric fields)", nums);
const win = nums.totalWin ?? nums.win ?? nums.payout ?? nums.baseWin ?? 0;
const newRows = (await c.rpc("listMyTransactionsFn", { tab: "all", limit: 300 }, { method: "GET" }).then((r) => (Array.isArray(r) ? r : r?.rows ?? []))).filter((r) => !idsBefore.has(r.id));
const ledgerSum = Number(newRows.reduce((t, r) => t + Number(r.amount), 0).toFixed(2));
say("new ledger rows (type, amount)", newRows.map((r) => [r.type, r.amount]));
say("balance change equals ledger sum", Number((after - before).toFixed(2)) === ledgerSum);
say("exactly one bet row of -bet", newRows.filter((r) => r.type === "bet").length === 1 && Number(newRows.find((r) => r.type === "bet").amount) === -bet);

const tx = await c.rpc("listMyTransactionsFn", {}, { method: "GET" }).catch((e) => `unavailable: ${e.message}`);
const rows = Array.isArray(tx) ? tx : (tx?.rows ?? tx?.items ?? []);
say("recent ledger rows (type, amount, balance_after, game)", Array.isArray(rows) ? rows.slice(0, 3).map((r) => [r.type, r.amount, r.balanceAfter ?? r.balance_after, r.game]) : String(tx));
await c.logout();
say("logout", "done");
