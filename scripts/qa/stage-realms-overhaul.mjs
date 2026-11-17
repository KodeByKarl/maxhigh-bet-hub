// Stage only verified Realms integration lines. Keep pre-existing shared-file work unstaged.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(
  execFileSync(process.execPath, ["scripts/qa/realms-overhaul.mjs", "list"], { encoding: "utf8" }),
);
const states = JSON.parse(fs.readFileSync("output/realms-overhaul/status.json", "utf8"));
const files = [
  "src/components/maxhigh/SlotControlDeck.tsx",
  "src/components/maxhigh/RealmsSlot.tsx",
];
for (const file of files) {
  let staged = execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" });
  if (file.includes("RealmsSlot") && !staged.includes("const MINI_TOAST_PREFIX:")) {
    const entries = queue
      .filter(([id]) => states[id]?.status === "VERIFIED")
      .map(([id, , prefix]) => `  "${id}": "${prefix}",`)
      .join("\n");
    const map = `/** Compact presentation notifications for the redesigned Realms cabinets. */\nconst MINI_TOAST_PREFIX: Record<string, string | undefined> = {\n${entries}\n};\n\n`;
    staged = staged.replace("export function RealmsSlot(", map + "export function RealmsSlot(");
    const current = fs.readFileSync(file, "utf8");
    const start = current.indexOf("      const toastPrefix = MINI_TOAST_PREFIX[gameId];");
    const end = current.indexOf('      if (label === "bet")', start);
    if (start < 0 || end < start) throw Error("Compact notification renderer not found");
    staged = staged.replace(
      '      if (label === "bet")',
      current.slice(start, end) + '      if (label === "bet")',
    );
  }
  for (const [game, component, prefix] of queue.filter(
    ([id]) => states[id]?.status === "VERIFIED",
  )) {
    if (file.includes("SlotControlDeck")) {
      if (!staged.includes(`import { ${component}Console }`))
        staged =
          `import { ${component}Console } from "@/games/${game}/${component}Console";\n` + staged;
      if (!staged.includes(`if (props.gameId === "${game}")`))
        staged = staged.replace(
          "export function SlotControlDeck(props: SlotControlDeckProps) {",
          `export function SlotControlDeck(props: SlotControlDeckProps) {\n  if (props.gameId === "${game}") return <${component}Console {...props} />;`,
        );
    } else {
      const marker = "const MINI_TOAST_PREFIX: Record<string, string | undefined> = {";
      if (staged.includes(marker) && !staged.includes(`"${game}": "${prefix}"`))
        staged = staged.replace(marker, `${marker}\n  "${game}": "${prefix}",`);
    }
  }
  const hash = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    input: staged,
    encoding: "utf8",
  }).trim();
  execFileSync("git", ["update-index", "--cacheinfo", `100644,${hash},${file}`]);
  console.log(`Staged verified integration only: ${file}`);
}
