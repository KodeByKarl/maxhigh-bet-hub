import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
const repo = path.resolve(import.meta.dirname, "../../..");
export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.join(repo, "public"),
  plugins: [react()],
  resolve: { alias: { "@": path.join(repo, "src") } },
  server: { port: 5199, strictPort: true, host: "127.0.0.1", fs: { allow: [repo] } },
  build: { outDir: path.join(repo, "output/buy-bonus-harness-dist"), emptyOutDir: true },
});
