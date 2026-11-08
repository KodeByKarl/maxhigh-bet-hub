/** Legacy entrypoint retained as a read-only migration gate. */
import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["scripts/migrate.mjs", ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
