import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { CitiesService } from '../modules/cities/cities.service';
import { ItinerariesService } from '../modules/itineraries/itineraries.service';
import { PlacesService } from '../modules/places/places.service';
import { DA_LAT_SEED } from './da-lat';
import { SeedModule } from './seed.module';

/** Ghi thành phố Đà Lạt và 4 cụm; tạo index cho places và itineraries. Chạy lại bao nhiêu lần cũng không tạo trùng. */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    await app.get(PlacesService).ensureIndexes();
    await app.get(ItinerariesService).ensureIndexes();
    const result = await app.get(CitiesService).applySeed(DA_LAT_SEED);
    console.log(
      `Seed ${DA_LAT_SEED.city.slug}: thành phố ${result.cityCreated ? 'tạo mới' : 'đã có'}, ` +
        `cụm tạo mới ${result.zonesCreated}, cập nhật ${result.zonesUpdated}.`,
    );
    if (result.staleZoneSlugs.length > 0) {
      console.warn(`Cụm có trong DB nhưng không còn trong seed (không xoá): ${result.staleZoneSlugs.join(', ')}`);
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error('Seed thất bại:', err);
  process.exitCode = 1;
});
