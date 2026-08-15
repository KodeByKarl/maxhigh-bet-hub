import sharp from "sharp";
import { join } from "node:path";

async function analyze(name: string) {
  const f = join(process.cwd(), "public/images/symbols/cny", name);
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let clear = 0;
  let darkOpaque = 0;
  let nearBlackA255 = 0;
  console.log("---", name, `${w}x${h}`);
  for (const [x, y] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [2, 2],
    [20, 20],
    [Math.floor(w / 2), 5],
  ] as const) {
    const o = (y * w + x) * 4;
    console.log(
      `  (${x},${y}) rgba=${data[o]},${data[o + 1]},${data[o + 2]},${data[o + 3]}`,
    );
  }
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const a = data[o + 3]!;
    const mx = Math.max(data[o]!, data[o + 1]!, data[o + 2]!);
    if (a < 8) clear++;
    else if (mx < 45) {
      darkOpaque++;
      if (a > 240) nearBlackA255++;
    }
  }
  console.log(
    `  clear%=${((clear / (w * h)) * 100).toFixed(1)} darkOpaque=${darkOpaque} solidBlack=${nearBlackA255}`,
  );
}

async function main() {
  for (const n of ["lantern.png", "lion.png", "fish.png", "coins.png", "a.png", "jug.png"]) {
    await analyze(n);
  }
}

main();
