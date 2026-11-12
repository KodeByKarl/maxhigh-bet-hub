// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { NitroConfig } from "nitro/types";

// The wrapper forwards these options; its public type covers fewer Nitro fields.
const nitroOptions = {
  preset: "node-server",
  compressPublicAssets: { gzip: true, brotli: true },
} satisfies NitroConfig;

export default defineConfig({
  vite: {
    // Keep the app's optimized React modules separate from standalone previews.
    cacheDir: "node_modules/.vite/maxhigh-app",
    optimizeDeps: {
      // Scan the application rather than generated audit/preview HTML files.
      entries: ["src/router.tsx"],
      include: ["@radix-ui/react-dropdown-menu"],
    },
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Self-hosted behind Caddy (https://maxhigh.online) — Node HTTP server, not Cloudflare Workers.
  nitro: nitroOptions,
});
