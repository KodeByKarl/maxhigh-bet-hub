import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
const repo = path.resolve(import.meta.dirname, "../../..");
const stubs = path.join(import.meta.dirname, ".stubs");

// Server functions cannot run in a plain Vite page. Every `@/functions/<name>` import is aliased to a generated stub whose exports
// reject (the games already catch these), so no server code is bundled.
fs.mkdirSync(stubs, { recursive: true });
const fnAliases = [];
for (const f of fs.readdirSync(path.join(repo, "src/functions"))) {
  if (!f.endsWith(".ts")) continue;
  const name = f.slice(0, -3);
  const src = fs.readFileSync(path.join(repo, "src/functions", f), "utf8");
  const exports = [...src.matchAll(/export (?:const|async function|function) (\w+)/g)].map(
    (m) => m[1],
  );
  const file = path.join(stubs, `${name}.mjs`);
  fs.writeFileSync(
    file,
    exports
      .map((n) => `export const ${n} = () => Promise.reject(new Error("qa stub: ${n}"));`)
      .join("\n") + "\nexport {};\n",
  );
  fnAliases.push({ find: new RegExp(`^@/functions/${name}$`), replacement: file });
}

export default defineConfig({
  root: import.meta.dirname,
  publicDir: path.join(repo, "public"),
  plugins: [tailwind(), react()],
  resolve: {
    alias: [
      ...fnAliases,
      { find: /^@\/lib\/auth$/, replacement: path.join(import.meta.dirname, "auth-stub.tsx") },
      { find: "@", replacement: path.join(repo, "src") },
    ],
  },
  optimizeDeps: { exclude: ["@tanstack/react-start", "@tanstack/start-server-core"] },
  server: { port: 5198, strictPort: true, host: "127.0.0.1", fs: { allow: [repo] } },
});
