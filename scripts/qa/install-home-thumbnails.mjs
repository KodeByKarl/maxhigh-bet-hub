import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = 'output/home-thumbnail-rework-2026-11-01';
const targetDir = 'public/games/home-v20261101';
fs.mkdirSync(targetDir, { recursive: true });
const files = fs.readdirSync(`${root}/generated`).filter(f => f.endsWith('.json'));
const originals = files.map(file => JSON.parse(fs.readFileSync(`${root}/generated/${file}`, 'utf8')));
const realms = JSON.parse(fs.readFileSync('output/realms-thumbnail-distinct-2026-11-01/prompts.json', 'utf8'));
const manifest = [...originals, ...realms];
const inventory = [];
for (const game of manifest) {
  if (!game.sourcePath || !fs.existsSync(game.sourcePath)) throw new Error(`Missing generation ${game.id}`);
  const buffer = await sharp(game.sourcePath).resize(768, 768, { fit: 'cover' }).webp({ quality: 90 }).toBuffer();
  const file = `${targetDir}/${game.id}.webp`;
  fs.writeFileSync(file, buffer);
  await sharp(file).stats();
  inventory.push({ id: game.id, name: game.name, file, bytes: buffer.length, hash: crypto.createHash('sha256').update(buffer).digest('hex') });
}
fs.writeFileSync(`${root}/prompts.json`, JSON.stringify(manifest, null, 2));
fs.writeFileSync(`${root}/inventory.json`, JSON.stringify(inventory, null, 2));
for (let page = 0; page < Math.ceil(originals.length / 10); page++) {
  const group = originals.slice(page * 10, page * 10 + 10);
  const composite = await Promise.all(group.map(async (game, i) => ({ input: await sharp(`${targetDir}/${game.id}.webp`).resize(256, 256).png().toBuffer(), left: (i % 5) * 256, top: Math.floor(i / 5) * 256 })));
  await sharp({ create: { width: 1280, height: 512, channels: 3, background: '#15121c' } }).composite(composite).png().toFile(`${root}/review-${page + 1}.png`);
}
console.log(JSON.stringify({ originalGames: originals.length, realmsGames: realms.length, installed: inventory.length, unique: new Set(inventory.map(x => x.hash)).size }, null, 2));
