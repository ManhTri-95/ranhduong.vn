import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional asset maintenance, not part of the web build. Reuse the API's installed image processor.
const require = createRequire(new URL('../../api/package.json', import.meta.url));
const sharp = require('sharp');
const directory = new URL('../public/images/home/', import.meta.url);
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing city-source.png, lake-source.jpg and coffee-source.jpg.');
for (const [name, extension] of [['city', 'png'], ['lake', 'jpg'], ['coffee', 'jpg']]) {
  for (const width of [400, 800, 1280]) {
    await sharp(resolve(sourceDirectory, `${name}-source.${extension}`))
      .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 })
      .toFile(fileURLToPath(new URL(`${name}-${width}.webp`, directory)));
  }
}
