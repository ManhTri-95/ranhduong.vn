import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PLACE_MODEL, type PlaceModel } from './schemas/place.schema';

/** Lớp dữ liệu của module places: chỉ file này import model Place. */
@Injectable()
export class PlacesRepository {
  constructor(@InjectModel(PLACE_MODEL) private readonly places: PlaceModel) {}

  /** Tạo index khai báo trong schema; không xoá index lạ (khác syncIndexes). */
  async ensureIndexes(): Promise<void> {
    await this.places.createIndexes();
  }
}
