import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { placePinSvg } from '../app/entities/place/lib/map-pin.ts';

// Reuse sharp already installed in the API, as in generate-og-default.mjs.
const sharp = createRequire(new URL('../../api/package.json', import.meta.url))('sharp');
const tokens = await readFile(new URL('../../../packages/ui/src/tokens.css', import.meta.url), 'utf8');
function color(name) {
  const value = tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]+)`))?.[1];
  if (!value) throw new Error(`Missing design token: ${name}`);
  return value;
}
const categories = ['attraction', 'cafe', 'food', 'activity', 'stay', 'shop'];
const output = new URL('../public/maps/notebook/', import.meta.url);
await mkdir(output, { recursive: true });
for (const ratio of [1, 2]) {
  // Two transparent pixels around each pin prevent atlas sampling bleed.
  const width = 40 * ratio;
  const height = 48 * ratio;
  const images = await Promise.all(categories.map(async (category, i) => ({
    input: await sharp(Buffer.from(placePinSvg(category, color('paper-raised'), color('ink')))).resize(36 * ratio, 44 * ratio).png().toBuffer(),
    left: i * width + 2 * ratio, top: 2 * ratio,
  })));
  const metadata = Object.fromEntries(categories.map((category, i) => [`pin-${category}`, {
    x: i * width + 2 * ratio, y: 2 * ratio, width: 36 * ratio, height: 44 * ratio, pixelRatio: ratio,
  }]));
  const suffix = ratio === 1 ? '' : '@2x';
  await sharp({ create: { width: categories.length * width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(images).png().toFile(fileURLToPath(new URL(`sprite${suffix}.png`, output)));
  await writeFile(new URL(`sprite${suffix}.json`, output), `${JSON.stringify(metadata, null, 2)}\n`);
}
console.log('Generated notebook map sprites (1x and 2x).');
