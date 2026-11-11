import assert from "node:assert/strict";
import { stagingPreviewResponse } from "../src/server/staging-preview.server";
const previous = process.env.STAGING_READ_ONLY;
try {
  process.env.STAGING_READ_ONLY = "1";
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    for (const pathname of [
      "/_serverFn/paid-round",
      "/api/deposit",
      "/api/withdraw",
      "/admin",
      "/images/%2e%2e%2f_serverFn/round",
    ]) {
      const response = stagingPreviewResponse(
        new Request("http://127.0.0.1" + pathname, { method }),
      );
      assert.equal(
        response?.status,
        423,
        `${method} ${pathname} must never reach application handlers`,
      );
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    }
  }
  assert.equal(stagingPreviewResponse(new Request("http://127.0.0.1/"))?.status, 200);
  assert.equal(stagingPreviewResponse(new Request("http://127.0.0.1/api/health")), undefined);
  assert.equal(
    stagingPreviewResponse(new Request("http://127.0.0.1/api/health", { method: "POST" }))?.status,
    423,
  );
  assert.equal(stagingPreviewResponse(new Request("http://127.0.0.1/assets/main.js")), undefined);
  delete process.env.STAGING_READ_ONLY;
  assert.equal(
    stagingPreviewResponse(new Request("http://127.0.0.1/_serverFn/round", { method: "POST" })),
    undefined,
  );
} finally {
  if (previous === undefined) delete process.env.STAGING_READ_ONLY;
  else process.env.STAGING_READ_ONLY = previous;
}
console.log(
  "PASS preview blocks RPC/financial methods and encoded-path bypasses; normal mode preserved",
);
