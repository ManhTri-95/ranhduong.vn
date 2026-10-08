import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { OpeningSlot, PlaceCategory, PlaceStatus, VerifySource } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import type { EditRow, PlaceUpdate } from './place-edit';
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

/** Lọc trong DB; thẻ, từ khoá, phân trang lọc trong bộ nhớ ở PlacesService. */
export interface ListFilter {
  categories?: PlaceCategory[];
  zoneId?: string;
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
  async listActive(cityId: string, filter: ListFilter = {}): Promise<ListedPlace[]> {
    const docs = await this.places
      .find(
        {
          cityId: new Types.ObjectId(cityId),
          status: 'active',
          ...(filter.categories ? { category: { $in: filter.categories } } : {}),
          ...(filter.zoneId ? { zoneId: new Types.ObjectId(filter.zoneId) } : {}),
        },
        CARD_FIELDS,
      )
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

  /** Địa điểm theo id để sửa trong admin; không có thì null. */
  async findForEdit(id: string): Promise<EditRow | null> {
    return this.places.findById(id).lean<EditRow>();
  }

  /** Tạo nháp từ form admin; trùng slug thì Mongo ném E11000 để service tính lại slug. */
  async insertDraft(cityId: string, fields: Record<string, unknown>): Promise<string> {
    const doc = await new this.places({ ...fields, cityId: new Types.ObjectId(cityId), status: 'draft', source: 'admin' }).save();
    return doc._id.toString();
  }

  /** Slug và slug cũ (slugHistory) trong thành phố khớp `base` hoặc `base-<số>`, trừ địa điểm `excludeId`. */
  async takenSlugs(cityId: string, base: string, excludeId?: string): Promise<Set<string>> {
    // base là slug (chỉ a-z, 0-9, '-') nên đưa thẳng vào RegExp được.
    const pattern = new RegExp(`^${base}(-\\d+)?$`);
    const docs = await this.places
      .find(
        {
          cityId: new Types.ObjectId(cityId),
          ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
          $or: [{ slug: pattern }, { slugHistory: pattern }],
        },
        { slug: 1, slugHistory: 1 },
      )
      .lean();
    const taken = new Set<string>();
    for (const doc of docs) {
      for (const slug of [doc.slug, ...(doc.slugHistory ?? [])]) if (pattern.test(slug)) taken.add(slug);
    }
    return taken;
  }

  /** PUT: thay các trường form, chỉ khi trạng thái vẫn là `expectedStatus`; trạng thái đã đổi thì null. */
  async replaceEditable(id: string, expectedStatus: PlaceStatus, update: PlaceUpdate): Promise<EditRow | null> {
    const { $set, $unset } = update;
    return this.places
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: expectedStatus },
        Object.keys($unset).length > 0 ? { $set, $unset } : { $set },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<EditRow>();
  }

  /**
   * Nháp → active, chỉ khi document chưa đổi từ lúc kiểm điều kiện (so updatedAt; null là document chèn thẳng,
   * chưa có updatedAt); đã đổi thì null. lastVerifiedAt là lúc kích hoạt.
   */
  async activate(id: string, expectedUpdatedAt: Date | null, now: Date): Promise<EditRow | null> {
    return this.places
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: 'draft', updatedAt: expectedUpdatedAt ?? { $exists: false } },
        { $set: { status: 'active', lastVerifiedAt: now } },
        { returnDocument: 'after' },
      )
      .lean<EditRow>();
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
