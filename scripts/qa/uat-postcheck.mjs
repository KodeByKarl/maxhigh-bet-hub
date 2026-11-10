// Read-only post-run check: account roles/balances and audit action counts (no writes).
import { Client } from "./uat-client.mjs";
const o = new Client(); await o.login("uat_owner");
const rows = (r) => (Array.isArray(r) ? r : (r?.rows ?? r?.users ?? r?.items ?? []));
const users = rows(await o.rpc("listSuperUsersFn", { limit: 300 }, { method: "GET" }));
console.log(users.map((u) => [u.username, u.role, u.balance].join(" | ")).join("\n"));
const audit = rows(await o.rpc("listAdminAuditLogsFn", { limit: 300, scope: "all" }, { method: "GET" }));
const c = {}; for (const a of audit) c[a.action] = (c[a.action] ?? 0) + 1;
console.log(JSON.stringify(c));
console.log(audit.filter((a) => a.action === "super.user_create").map((a) => `${a.createdAt ?? a.created_at} ${a.target ?? a.targetId ?? ""}`).join("\n"));
await o.logout();
