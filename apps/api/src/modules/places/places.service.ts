import { Injectable } from '@nestjs/common';
import { PlacesRepository } from './places.repository';

@Injectable()
export class PlacesService {
  constructor(private readonly repo: PlacesRepository) {}

  /** Dùng cho lệnh seed và khởi tạo môi trường mới; CRUD địa điểm thêm ở S05. */
  ensureIndexes(): Promise<void> {
    return this.repo.ensureIndexes();
  }
}
