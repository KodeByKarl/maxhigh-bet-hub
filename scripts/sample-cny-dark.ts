import sharp from "sharp";
import { join } from "node:path";

async function sampleDark(name: string) {
  const f = join(process.cwd(), "public/images/symbols/cny", name);
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const samples: string[] = [];
  for (let y = 0; y < h; y += 32) {
    for (let x = 0; x < w; x += 32) {
      const o = (y * w + x) * 4;
      const a = data[o + 3]!;
      const mx = Math.max(data[o]!, data[o + 1]!, data[o + 2]!);
      if (a > 200 && mx < 40) {
        samples.push(`(${x},${y}) rgb=${data[o]},${data[o + 1]},${data[o + 2]} a=${a}`);
        if (samples.length >= 12) break;
      }
    }
    if (samples.length >= 12) break;
  }
  console.log(name, samples.join(" | "));
}

async function main() {
  for (const n of ["lantern.png", "lion.png", "fish.png", "coins.png"]) await sampleDark(n);
}
main();
