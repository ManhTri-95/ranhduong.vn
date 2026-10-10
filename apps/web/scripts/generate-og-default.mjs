import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Uses the API's existing sharp dependency; this only generates a committed static branding asset.
const sharp = createRequire(new URL('../../api/package.json', import.meta.url))('sharp');
const tokens = await readFile(new URL('../../../packages/ui/src/tokens.css', import.meta.url), 'utf8');
const color = (name) => tokens.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]+)`))?.[1];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${color('paper')}"/>
<path d="M80 470 Q280 260 450 420 T1120 260" fill="none" stroke="${color('mist')}" stroke-width="45"/>
<circle cx="1050" cy="100" r="180" fill="${color('accent')}"/>
<g fill="${color('ink')}" font-family="Arial, sans-serif">
<text x="85" y="235" font-size="100" font-weight="700">Rành Đường</text>
<text x="90" y="330" font-size="44">Ghi chép của người rành đường</text>
<text x="90" y="530" font-size="32">ranhduong.vn</text>
</g></svg>`;
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og-default.png', import.meta.url)));
