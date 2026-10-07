import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { OpeningSlot, PlaceCategory, VerifySource } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import type { ListedPlace } from './place-listing';
import { PLACE_MODEL, type PlaceModel } from './schemas/place.schema';

/** Trường của thẻ địa điểm; ảnh chỉ lấy tấm đầu. */
const CARD_FIELDS = {
  slug: 1,
  name: 1,
  aliases: 1,
  tags: 1,
  category: 1,
  zoneId: 1,
  practicalNotes: 1,
  openingHours: 1,
  verifySource: 1,
  lastVerifiedAt: 1,
  photos: { $slice: 1 },
};

// Mongoose suy kiểu kết quả từ projection nhưng không hiểu $slice, nên khai báo kiểu dòng đọc ra (khớp projection).
interface CardRow {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  aliases?: string[];
  tags?: string[];
  category: PlaceCategory;
  zoneId?: Types.ObjectId | null;
  practicalNotes?: string | null;
  openingHours?: OpeningSlot[];
  verifySource?: VerifySource | null;
  lastVerifiedAt?: Date | null;
  photos?: { key: string }[];
}
interface CoverRow {
  _id: Types.ObjectId;
  photos?: { key: string }[];
}

/** Lớp dữ liệu của module places: chỉ file này import model Place. */
@Injectable()
export class PlacesRepository {
  constructor(@InjectModel(PLACE_MODEL) private readonly places: PlaceModel) {}

  /** Tạo index khai báo trong schema; không xoá index lạ (khác syncIndexes). */
  async ensureIndexes(): Promise<void> {
    await this.places.createIndexes();
  }

  /**
   * Địa điểm active của thành phố, chỉ đọc các trường của thẻ; ảnh đầu tiên làm ảnh bìa.
   * Đọc hết rồi xếp trong bộ nhớ: lát 1 có vài trăm điểm mỗi thành phố (đổi khi quá khoảng 1.000 điểm).
   */
  async listActive(cityId: string, categories?: PlaceCategory[]): Promise<ListedPlace[]> {
    const docs = await this.places
      .find({ cityId: new Types.ObjectId(cityId), status: 'active', ...(categories ? { category: { $in: categories } } : {}) }, CARD_FIELDS)
      .lean<CardRow[]>();
    return docs.map((d) => ({
      slug: d.slug,
      name: d.name,
      aliases: d.aliases ?? [],
      tags: d.tags ?? [],
      category: d.category,
      zoneId: d.zoneId?.toString(),
      practicalNotes: d.practicalNotes ?? undefined,
      openingHours: (d.openingHours ?? []).map(({ day, open, close }) => ({ day, open, close })),
      verifySource: d.verifySource ?? undefined,
      lastVerifiedAt: d.lastVerifiedAt ?? undefined,
      coverKey: d.photos?.[0]?.key,
    }));
  }

  /** placeId → key ảnh đầu tiên, chỉ địa điểm active có ảnh. */
  async coverKeys(placeIds: string[]): Promise<Map<string, string>> {
    if (placeIds.length === 0) return new Map();
    const docs = await this.places
      .find(
        { _id: { $in: placeIds.map((id) => new Types.ObjectId(id)) }, status: 'active', 'photos.0': { $exists: true } },
        { photos: { $slice: 1 } },
      )
      .lean<CoverRow[]>();
    return new Map(docs.flatMap((d) => (d.photos?.[0] ? [[d._id.toString(), d.photos[0].key] as const] : [])));
  }
}
