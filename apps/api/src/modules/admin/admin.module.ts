import { Module } from '@nestjs/common';
import { CitiesModule } from '../cities/cities.module';
import { PlacesModule } from '../places/places.module';
import { AdminCitiesController } from './admin-cities.controller';
import { AdminPlacesController } from './admin-places.controller';

/**
 * Route quản trị (tầng ngoài cùng, architecture mục 4): chỉ gọi service của cities và places; mọi route có AdminGuard.
 * Tách khỏi CitiesModule, PlacesModule để lệnh seed và test các module đó không cần ConfigModule, SessionModule.
 */
@Module({
  imports: [CitiesModule, PlacesModule],
  controllers: [AdminPlacesController, AdminCitiesController],
})
export class AdminModule {}
