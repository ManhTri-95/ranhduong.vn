import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { OverpassResponse, Slug } from '@ranhduong/contracts';
import { loadOsmEnv } from '../config/env';
import { CitiesService } from '../modules/cities/cities.service';
import { PlaceOsmImportService } from '../modules/places/place-osm-import.service';
import { fetchOverpass } from './overpass';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      city: { type: 'string', default: 'da-lat' },
      'dry-run': { type: 'boolean', default: false },
      input: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log('Import địa điểm OSM thành nháp. Chạy pnpm seed trước nếu chưa có Đà Lạt.\n' +
      'pnpm import:osm [--city da-lat] [--dry-run] [--input <file.json>]\n' +
      '--dry-run: chỉ báo số lượng, không ghi dữ liệu hay tạo index.\n' +
      '--input: đọc JSON Overpass thay vì gọi mạng; dùng đường dẫn tuyệt đối hoặc tương đối với apps/api.');
    return;
  }
  const citySlug = Slug.parse(values.city);
  const env = loadOsmEnv();
  // Validate an offline snapshot before even connecting to the database.
  const snapshot = values.input ? OverpassResponse.parse(JSON.parse(await readFile(values.input, 'utf8'))) : undefined;
  const { SeedModule } = await import('./seed.module.js');
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'], abortOnError: false });
  try {
    const city = await app.get(CitiesService).getPublic(citySlug);
    console.log(`${values['dry-run'] ? 'Xem trước' : 'Import'} OSM ${city.name}, khung [tây, nam, đông, bắc]: ${city.mapBounds.join(', ')}.`);
    const response = snapshot ?? await fetchOverpass(city.mapBounds, env.OVERPASS_URL);
    const result = await app.get(PlaceOsmImportService).run(citySlug, response, values['dry-run']);
    console.log(`Nhận ${result.received}; ${result.dryRun ? `dự kiến tạo ${result.wouldCreate}` : `tạo nháp ${result.created}`}; đã có ${result.existing}; bỏ qua ${result.skipped}.`);
    if (!result.dryRun && result.created > 0) console.log('Mở admin để chọn khu vực, bổ sung và xác minh các nháp trước khi kích hoạt.');
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error('Import OSM thất bại:', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
