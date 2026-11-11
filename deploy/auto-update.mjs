import { pathToFileURL } from "node:url";
import {
  checkUpdateStatus,
  prepareRelease,
  activateRelease,
  exportRelease,
  importRelease,
} from "./release-manager.mjs";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
export * from "./release-manager.mjs";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // The production control plane needs no development/root node_modules tree.
  const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const [mode, sha] = process.argv.slice(2);
  if (mode === "--prepare") console.log(JSON.stringify(await prepareRelease(sha)));
  else if (mode === "--activate") console.log(JSON.stringify(await activateRelease(sha)));
  else if (mode === "--check") console.log(JSON.stringify(await checkUpdateStatus()));
  else if (mode === "--export")
    console.log(
      JSON.stringify(
        exportRelease(
          path.resolve(path.dirname(fileURLToPath(import.meta.url)), "releases", sha),
          process.argv[4],
        ),
      ),
    );
  else if (mode === "--import")
    console.log(JSON.stringify(importRelease(sha, process.env.RELEASE_MANIFEST_SHA256)));
  else
    throw new Error(
      "Use --check, --prepare <sha>, --export <sha> <directory>, --import <directory>, or explicitly authorized --activate <sha>",
    );
}
