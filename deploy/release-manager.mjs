import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import os from "node:os";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASES = path.join(ROOT, "deploy/releases");

export function artifactDigest(directory) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(65536);
  const visit = (folder) => {
    for (const entry of fs
      .readdirSync(folder, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw Error("Release artifacts cannot contain symlinks");
      if (entry.isDirectory()) visit(file);
      else {
        hash.update(path.relative(directory, file).replaceAll("\\", "/"));
        hash.update("\0");
        const handle = fs.openSync(file, "r");
        try {
          let bytes;
          while ((bytes = fs.readSync(handle, buffer, 0, buffer.length, null)) > 0)
            hash.update(buffer.subarray(0, bytes));
        } finally {
          fs.closeSync(handle);
        }
      }
    }
  };
  visit(path.join(directory, ".output"));
  return hash.digest("hex");
}

function resourceGate(minimumDiskBytes) {
  if (process.env.DEPLOY_PROFILE !== "ph-vps-2") return;
  let available = os.freemem();
  if (process.platform === "linux")
    available =
      Number(fs.readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+)/m)?.[1] ?? 0) *
      1024;
  const disk = fs.statfsSync(ROOT);
  if (available < 768 * 1024 ** 2 || disk.bavail * disk.bsize < minimumDiskBytes)
    throw Error("Insufficient RAM/disk headroom for a safe release operation");
}

function assertRegularTree(directory) {
  if (fs.lstatSync(directory).isSymbolicLink()) throw Error("Release symlinks are not accepted");
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error("Release symlinks are not accepted");
    if (!entry.isDirectory() && !entry.isFile()) throw Error("Release contains a non-regular file");
    if (entry.isDirectory()) assertRegularTree(file);
  }
}

function migrationDigest(directory) {
  const hash = createHash("sha256");
  for (const file of fs
    .readdirSync(path.join(directory, "drizzle"))
    .filter((file) => /^\d{4}_.*\.sql$/.test(file))
    .sort()) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(directory, "drizzle", file)));
  }
  return hash.digest("hex");
}

export async function bundleMigration(directory) {
  const { build } = await import("esbuild");
  await build({
    entryPoints: [path.join(directory, "scripts/migrate.mjs")],
    outfile: path.join(directory, ".output/migrate.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    banner: {
      js: 'import {createRequire as __makeRequire} from "node:module";const require=__makeRequire(import.meta.url);',
    },
    logLevel: "silent",
  });
}

export function validateRelease(directory, { platform = true } = {}) {
  assertRegularTree(path.join(directory, ".output"));
  assertRegularTree(path.join(directory, "drizzle"));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, "release-validation.json"), "utf8"),
  );
  if (
    !/^[a-f0-9]{40}$/.test(manifest.sha) ||
    manifest.artifactDigest !== artifactDigest(directory) ||
    !["typecheck", "lint", "test:unit", "build"].every((check) => manifest.checks?.includes(check))
  )
    throw Error("Release validation incomplete");
  if (manifest.artifactFormat === "portable-v1") {
    if (
      manifest.migrationDigest !== migrationDigest(directory) ||
      !fs.existsSync(path.join(directory, ".output/migrate.mjs"))
    )
      throw Error("Migration artifact validation failed");
    if (
      platform &&
      (manifest.platform !== process.platform ||
        manifest.arch !== process.arch ||
        manifest.nodeMajor !== Number(process.versions.node.split(".")[0]))
    )
      throw Error("Build platform, architecture and Node major must match the runtime");
  }
  return manifest;
}

export function exportRelease(directory, destination, { incoming = false } = {}) {
  const manifest = validateRelease(directory);
  if (manifest.artifactFormat !== "portable-v1")
    throw Error("Prepare a portable release with the current trusted builder first");
  if (fs.existsSync(destination)) throw Error("Export destination already exists");
  fs.mkdirSync(destination, { recursive: true });
  if (incoming)
    fs.writeFileSync(
      path.join(destination, ".maxhigh-incoming.json"),
      JSON.stringify({ sha: manifest.sha, pid: process.pid, createdAt: new Date().toISOString() }),
    );
  for (const item of [".output", "drizzle", "release-validation.json"])
    fs.cpSync(path.join(directory, item), path.join(destination, item), { recursive: true });
  validateRelease(destination);
  return {
    sha: manifest.sha,
    directory: destination,
    manifestSha256: createHash("sha256")
      .update(fs.readFileSync(path.join(destination, "release-validation.json")))
      .digest("hex"),
  };
}

export function importRelease(source, expectedManifestHash) {
  resourceGate(5 * 1024 ** 3);
  if (!/^[a-f0-9]{64}$/.test(expectedManifestHash ?? ""))
    throw Error("Pin the trusted builder's manifest SHA-256 before import");
  const actual = createHash("sha256")
    .update(fs.readFileSync(path.join(source, "release-validation.json")))
    .digest("hex");
  if (actual !== expectedManifestHash) throw Error("Trusted manifest hash mismatch");
  const manifest = validateRelease(source);
  const destination = path.join(RELEASES, manifest.sha);
  if (fs.existsSync(destination)) throw Error("Release already exists");
  const temporary = path.join(RELEASES, ".incoming-" + manifest.sha + "-" + randomUUID());
  const result = exportRelease(source, temporary, { incoming: true });
  fs.renameSync(temporary, destination);
  return { ...result, directory: destination };
}

function run(command, args, cwd = ROOT, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === "win32" && ["npm", "pm2"].includes(command),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => {
      stdout = (stdout + d).slice(args.includes("jlist") ? -1048576 : -65536);
    });
    child.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-65536);
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(Error(`${command} failed (${code}): ${stderr.slice(-2000)}`)),
    );
  });
}

async function stopServingApp() {
  const name = process.env.DEPLOY_PM2_APP ?? "maxhigh-app";
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw Error("Invalid PM2 application name");
  const processes = JSON.parse(
    await run("pm2", ["jlist", "--silent"], ROOT, { PM2_SILENT: "true" }),
  );
  const existing = processes.find((app) => app.name === name);
  if (existing) {
    const normalize = (value) =>
      process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
    if (normalize(existing.pm2_env.pm_cwd) !== normalize(ROOT))
      throw Error("Refusing to replace an application owned by another directory");
    // A failed readiness/backoff cycle can leave a scheduled restart behind a
    // fork reload. Recreate only this owned process to cancel that old timer.
    // This is a release action, never a memory-pressure restart loop.
    await run("pm2", ["delete", name]);
  }
}

async function startServingApp() {
  const name = process.env.DEPLOY_PM2_APP ?? "maxhigh-app";
  const config =
    process.env.DEPLOY_PROFILE === "ph-vps-2"
      ? path.join(ROOT, "deploy/profiles/ph-vps-2/pm2.config.cjs")
      : path.join(ROOT, "deploy/ecosystem.config.cjs");
  await run("pm2", ["start", config, "--only", name, "--update-env"]);
}

export async function checkUpdateStatus() {
  const branch = process.env.DEPLOY_BRANCH ?? "main";
  if (!/^[a-zA-Z0-9_/-]+$/.test(branch) || branch.startsWith("-")) throw Error("Invalid branch");
  await run("git", ["fetch", "origin", branch]);
  const local = await run("git", ["rev-parse", "HEAD"]);
  const remote = await run("git", ["rev-parse", `origin/${branch}`]);
  const behindCount = Number(await run("git", ["rev-list", "--count", `HEAD..${remote}`]));
  return { local, remote, behindCount, behind: behindCount > 0 };
}

export async function probeHealth(url, { fetcher = fetch, attempts = 20, expectedSha } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const result = await response.json();
        if (result.ok === true && (!expectedSha || result.release === expectedSha)) return;
      }
    } catch {
      /* bounded retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error("Release health check failed");
}

export async function switchRelease({
  pointer,
  directory,
  reload,
  health,
  previousPointer,
  quiesce,
}) {
  const previous = fs.existsSync(pointer) ? fs.readFileSync(pointer, "utf8") : null;
  // Finish stopping the old fork/backoff task before its pointer changes.
  if (quiesce) await quiesce();
  const temp = pointer + ".tmp";
  let switched = false;
  try {
    fs.writeFileSync(temp, JSON.stringify({ directory }));
    fs.renameSync(temp, pointer);
    switched = true;
    await reload();
    await health();
    if (previous !== null && previousPointer) {
      fs.writeFileSync(previousPointer + ".tmp", previous);
      fs.renameSync(previousPointer + ".tmp", previousPointer);
    }
  } catch (error) {
    if (quiesce) await quiesce();
    if (switched && previous !== null) {
      fs.writeFileSync(temp, previous);
      fs.renameSync(temp, pointer);
    } else if (switched) fs.unlinkSync(pointer);
    if (previous === null) throw error;
    await reload();
    await health();
    throw error;
  }
}

export async function prepareRelease(sha) {
  if (process.env.DEPLOY_PROFILE === "ph-vps-2")
    throw Error(
      "Build on the trusted external builder, then import the verified portable artifact",
    );
  if (!/^[a-f0-9]{40}$/.test(sha)) throw Error("A full immutable revision is required");
  fs.mkdirSync(RELEASES, { recursive: true });
  const directory = path.join(RELEASES, sha);
  if (fs.existsSync(directory))
    throw Error("Release already exists; inspect its validation manifest");
  await run("git", ["worktree", "add", "--detach", directory, sha]);
  await run("npm", ["ci"], directory);
  const checks = [];
  for (const script of ["typecheck", "lint", "test:unit", "build"]) {
    await run("npm", ["run", script], directory, { NODE_ENV: "production", RELEASE_SHA: sha });
    checks.push(script);
  }
  await bundleMigration(directory);
  fs.writeFileSync(
    path.join(directory, "release-validation.json"),
    JSON.stringify(
      {
        sha,
        checks,
        artifactDigest: artifactDigest(directory),
        artifactFormat: "portable-v1",
        storageCodecs: ["json", "gz1"],
        migrationDigest: migrationDigest(directory),
        platform: process.platform,
        arch: process.arch,
        nodeMajor: Number(process.versions.node.split(".")[0]),
        validatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  return { directory, sha, checks };
}

export async function activateRelease(sha) {
  fs.mkdirSync(RELEASES, { recursive: true });
  const lock = path.join(RELEASES, "activation.lock");
  const handle = fs.openSync(lock, "wx");
  try {
    return await activateLocked(sha);
  } finally {
    fs.closeSync(handle);
    fs.unlinkSync(lock);
  }
}

async function activateLocked(sha) {
  resourceGate(2 * 1024 ** 3);
  if (!/^[a-f0-9]{40}$/.test(sha)) throw Error("Invalid revision");
  const directory = path.join(RELEASES, sha);
  const manifest = validateRelease(directory);
  if (manifest.sha !== sha) throw Error("Release identity mismatch");
  const codecPolicy = path.join(RELEASES, "storage-requirements.json");
  const required = fs.existsSync(codecPolicy)
    ? JSON.parse(fs.readFileSync(codecPolicy, "utf8")).codecs
    : [];
  if (required.some((codec) => !manifest.storageCodecs?.includes(codec)))
    throw Error("Release cannot read persisted receipt codecs");
  if (process.env.OPERATION_COMPRESSION === "1") {
    if (!manifest.storageCodecs?.includes("gz1"))
      throw Error("Release lacks the compressed receipt reader");
    const currentPointer = path.join(RELEASES, "current.json");
    if (!fs.existsSync(currentPointer))
      throw Error("Initialize compatible reader releases with compression disabled first");
    if (fs.existsSync(currentPointer)) {
      const previous = JSON.parse(fs.readFileSync(currentPointer, "utf8"));
      const previousManifest = JSON.parse(
        fs.readFileSync(path.join(previous.directory, "release-validation.json"), "utf8"),
      );
      if (!previousManifest.storageCodecs?.includes("gz1"))
        throw Error("First deploy two compatible receipt readers with compression disabled");
    }
  }
  const migrator = manifest.artifactFormat === "portable-v1" ? ".output/migrate.mjs" : "scripts/migrate.mjs";
  // Mandatory read-only preflight: a non-zero exit (data issue or checksum mismatch) aborts the release
  // before the pending-migration check and before any candidate starts.
  await run(process.execPath, [migrator, "--preflight"], directory);
  await run(process.execPath, [migrator], directory);
  const port = Number(process.env.DEPLOY_CANDIDATE_PORT ?? 18081);
  const candidate = spawn(
    process.execPath,
    ["--max-old-space-size=256", path.join(directory, ".output/server/index.mjs")],
    {
      cwd: ROOT,
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        HOST: "127.0.0.1",
      NITRO_HOST:"127.0.0.1",
      NITRO_PORT:String(port),
        PORT: String(port),
        RELEASE_SHA: sha,
        DB_POOL_LIMIT: "2",
        DB_POOL_MAX_IDLE: "1",
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    },
  );
  try {
    await probeHealth(`http://127.0.0.1:${port}/api/health`, { expectedSha: sha });
    if (candidate.exitCode !== null || candidate.signalCode !== null)
      throw Error("Candidate exited before activation");
  } finally {
    if (candidate.connected) candidate.send("shutdown");
    else candidate.kill();
    await new Promise((resolve) => {
      if (candidate.exitCode !== null || candidate.signalCode !== null) return resolve();
      const timer = setTimeout(() => candidate.kill(), 35000);
      timer.unref();
      candidate.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await switchRelease({
    pointer: path.join(RELEASES, "current.json"),
    previousPointer: path.join(RELEASES, "previous.json"),
    directory,
    quiesce: stopServingApp,
    reload: startServingApp,
    health: () => {
      const current = JSON.parse(fs.readFileSync(path.join(RELEASES, "current.json"), "utf8"));
      const revision = JSON.parse(
        fs.readFileSync(path.join(current.directory, "release-validation.json"), "utf8"),
      ).sha;
      return probeHealth(`http://127.0.0.1:${Number(process.env.PORT ?? 8080)}/api/health`, {
        expectedSha: revision,
      });
    },
  });
  if (process.env.OPERATION_COMPRESSION === "1") {
    fs.writeFileSync(codecPolicy + ".tmp", JSON.stringify({ codecs: ["json", "gz1"] }));
    fs.renameSync(codecPolicy + ".tmp", codecPolicy);
  }
  return { sha, activated: true };
}

export async function runAutoUpdate() {
  throw Error(
    "Automatic activation disabled. Explicitly prepare, review and activate an immutable release.",
  );
}
