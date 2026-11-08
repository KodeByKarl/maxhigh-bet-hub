import "dotenv/config";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const localDemo =
  !process.env.DATABASE_URL &&
  process.env.MYSQL_DATABASE === "maxhigh_demo" &&
  Boolean(process.env.DEMO_DB_ROOT_PASSWORD);

function run(command, args, quiet = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: quiet ? "ignore" : "inherit",
      windowsHide: true,
    });
    child.once("error", () => reject(new Error(`Unable to start ${command}.`)));
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} did not complete successfully.`)),
    );
  });
}

async function checkDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(
      process.env.DATABASE_URL ?? {
        host: process.env.MYSQL_HOST ?? "127.0.0.1",
        port: Number(process.env.MYSQL_PORT ?? 3306),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        connectTimeout: 5000,
      },
    );
    await connection.query("SELECT 1");
    await connection.query("SELECT id FROM users LIMIT 1");
  } catch (error) {
    const code =
      typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
        ? error.code
        : "CONNECTION_FAILED";
    throw new Error(
      `Database check failed (${code}). Check the database connection or see docs/local-demo-database.md.`,
    );
  } finally {
    if (connection) await connection.end();
  }
}

try {
  if (localDemo) {
    try {
      await run("docker", ["info", "--format", "{{.ServerVersion}}"], true);
    } catch {
      if (process.platform !== "win32" && process.platform !== "darwin")
        throw new Error("Start Docker before starting the local demo.");
      console.log("[dev] Starting Docker Desktop for the local demo database…");
      await run("docker", ["desktop", "start"]);
    }
    await run("docker", ["compose", "-f", "compose.demo.yml", "up", "-d", "--wait"]);
  }
  await checkDatabase();
  console.log("[dev] Database connection and users table ready. Starting the app…");
  const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  const child = spawn(process.execPath, [vite, "dev", ...process.argv.slice(2)], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  child.once("error", () => {
    console.error("[dev] Could not start Vite.");
    process.exitCode = 1;
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.once("exit", (code) => process.exit(code ?? 0));
} catch (error) {
  console.error(`[dev] ${error.message}`);
  process.exitCode = 1;
}
