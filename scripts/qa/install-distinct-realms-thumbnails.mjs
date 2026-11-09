import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = 'output/realms-thumbnail-distinct-2026-11-01';
const manifest = JSON.parse(fs.readFileSync(`${root}/prompts.json`, 'utf8'));
fs.mkdirSync(`${root}/previous`, { recursive: true });
const inventory = [];
for (const game of manifest) {
  if (!game.sourcePath || !fs.existsSync(game.sourcePath)) continue;
  const target = `public/games/realms-illustrated/${game.id}.webp`;
  const backup = `${root}/previous/${game.id}.webp`;
  if (fs.existsSync(target) && !fs.existsSync(backup)) fs.copyFileSync(target, backup);
  const buffer = await sharp(game.sourcePath).resize(768, 768, { fit: 'cover' }).webp({ quality: 90 }).toBuffer();
  fs.writeFileSync(target, buffer);
  const metadata = await sharp(target).metadata();
  await sharp(target).stats();
  inventory.push({ id: game.id, file: target, width: metadata.width, height: metadata.height, bytes: buffer.length, hash: crypto.createHash('sha256').update(buffer).digest('hex') });
}
fs.writeFileSync(`${root}/inventory.json`, JSON.stringify(inventory, null, 2));
for (let page = 0; page < Math.ceil(inventory.length / 10); page++) {
  const group = inventory.slice(page * 10, page * 10 + 10);
  const tiles = await Promise.all(group.map(async (game, i) => ({ input: await sharp(game.file).resize(256, 256).png().toBuffer(), left: (i % 5) * 256, top: Math.floor(i / 5) * 256 })));
  await sharp({ create: { width: 1280, height: 512, channels: 3, background: '#14101d' } }).composite(tiles).png().toFile(`${root}/review-${page + 1}.png`);
}
console.log(JSON.stringify({ installed: inventory.length, unique: new Set(inventory.map(x => x.hash)).size, missing: manifest.filter(g => !inventory.some(x => x.id === g.id)).map(g => g.id) }, null, 2));
