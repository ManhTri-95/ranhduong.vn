import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { OpeningSlot, Place, PlaceCategory, PlaceStatus, VerifySource } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import type { DuplicateRow, EditRow, PlaceUpdate, SummaryRow } from './place-edit';
import type { ListedPlace } from './place-listing';
import type { DetailRow } from './place-detail';
import { PLACE_MODEL, type PlaceModel } from './schemas/place.schema';

/** Trường của thẻ địa điểm; ảnh chỉ lấy tấm đầu. */
const CARD_FIELDS = {
  slug: 1,
  name: 1,
  aliases: 1,
  tags: 1,
  category: 1,
  alsoCategories: 1,
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
  alsoCategories?: PlaceCategory[];
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

/** Các trường đọc ra để so trùng. */
type DuplicateDoc = Pick<EditRow, '_id' | 'name' | 'aliases' | 'status' | 'zoneId' | 'location' | 'contact' | 'ids'>;

/** Trường của một dòng danh sách admin (SummaryRow). */
const SUMMARY_FIELDS = {
  status: 1,
  slug: 1,
  name: 1,
  aliases: 1,
  category: 1,
  alsoCategories: 1,
  zoneId: 1,
  location: 1,
  openingHours: 1,
  verifySource: 1,
  lastVerifiedAt: 1,
  photos: 1,
  updatedAt: 1,
};

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

  /** Current slug takes precedence over historical aliases, including private current records. */
  async findDetail(cityId: string, slug: string): Promise<DetailRow | null> {
    const city = new Types.ObjectId(cityId);
    return (await this.places.findOne({ cityId: city, slug }).lean<DetailRow>())
      ?? this.places.findOne({ cityId: city, slugHistory: slug }).lean<DetailRow>();
  }

  async findDetailById(cityId: string, id: string): Promise<DetailRow | null> {
    return this.places.findOne({ cityId: new Types.ObjectId(cityId), _id: new Types.ObjectId(id) }).lean<DetailRow>();
  }

  /** 2dsphere index sorts by distance; only active places in this city can be suggestions. */
  async nearby(cityId: string, place: DetailRow): Promise<DetailRow[]> {
    if (!place.location) return [];
    const similar = place.status === 'closed' ? { $or: [{ category: place.category }, { alsoCategories: place.category }] } : {};
    return this.places.find({
      cityId: new Types.ObjectId(cityId), _id: { $ne: place._id }, status: 'active',
      location: { $near: { $geometry: place.location } }, ...similar,
    }).limit(place.status === 'closed' ? 3 : 6).lean<DetailRow[]>();
  }

  async hasOsmId(cityId: string, osmId: string): Promise<boolean> {
    return (await this.places.exists({ cityId: new Types.ObjectId(cityId), 'ids.osmId': osmId })) !== null;
  }

  /** Insert only: a retry must not change curated fields, status or updatedAt. */
  async upsertOsmDraft(input: Place): Promise<boolean> {
    const now = new Date();
    const cityId = new Types.ObjectId(input.cityId);
    const result = await this.places.updateOne(
      { cityId, 'ids.osmId': input.ids.osmId },
      { $setOnInsert: { ...input, cityId, createdAt: now, updatedAt: now } },
      { upsert: true, runValidators: true, timestamps: false },
    );
    return result.upsertedCount === 1;
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
          // Danh mục chính hoặc một danh mục phụ (S27); $or trả mỗi địa điểm một lần.
          ...(filter.categories ? { $or: [{ category: { $in: filter.categories } }, { alsoCategories: { $in: filter.categories } }] } : {}),
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
      alsoCategories: d.alsoCategories ?? [],
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

  async attachPhoto(id: string, photo: import('@ranhduong/contracts').PlacePhoto): Promise<EditRow | null> {
    return this.places.findOneAndUpdate(
      { _id: new Types.ObjectId(id), status: { $ne: 'merged' }, 'photos.key': { $ne: photo.key } },
      { $push: { photos: photo } },
      { returnDocument: 'after', runValidators: true },
    ).lean<EditRow>();
  }

  /** Địa điểm chưa gộp của thành phố cho danh sách admin (S07); đọc hết, admin lọc trong trình duyệt (vài trăm điểm). */
  async listForAdmin(cityId: string): Promise<SummaryRow[]> {
    return this.places.find({ cityId: new Types.ObjectId(cityId), status: { $ne: 'merged' } }, SUMMARY_FIELDS).lean<SummaryRow[]>();
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
   * Nháp → active, chỉ khi document chưa đổi từ lúc kiểm điều kiện (so updatedAt; null khớp document chèn thẳng
   * chưa có updatedAt hoặc updatedAt null); đã đổi thì null. lastVerifiedAt là lúc kích hoạt.
   */
  async activate(id: string, expectedUpdatedAt: Date | null, now: Date): Promise<EditRow | null> {
    return this.places
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: 'draft', updatedAt: expectedUpdatedAt },
        { $set: { status: 'active', lastVerifiedAt: now } },
        { returnDocument: 'after' },
      )
      .lean<EditRow>();
  }

  /**
   * Đổi trạng thái (và các trường đi kèm), chỉ khi document còn như lúc đọc: cùng trạng thái, cùng updatedAt
   * (null khớp document chèn thẳng chưa có updatedAt hoặc updatedAt null). Đã đổi thì null.
   */
  async transition(id: string, expected: { status: PlaceStatus; updatedAt: Date | null }, set: Record<string, unknown>): Promise<EditRow | null> {
    return this.places
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), status: expected.status, updatedAt: expected.updatedAt },
        { $set: set },
        { returnDocument: 'after', runValidators: true },
      )
      .lean<EditRow>();
  }

  /** Xoá hẳn, chỉ khi còn là nháp; false khi không có hoặc không còn là nháp. */
  async deleteDraft(id: string): Promise<boolean> {
    const { deletedCount } = await this.places.deleteOne({ _id: new Types.ObjectId(id), status: 'draft' });
    return deletedCount === 1;
  }

  /** Địa điểm chưa gộp của thành phố, đủ trường để chấm điểm trùng; đọc hết rồi so trong bộ nhớ (vài trăm điểm). */
  async listForDuplicateCheck(cityId: string, excludeId?: string): Promise<DuplicateRow[]> {
    const docs = await this.places
      .find(
        {
          cityId: new Types.ObjectId(cityId),
          status: { $ne: 'merged' },
          ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
        },
        { name: 1, aliases: 1, status: 1, zoneId: 1, location: 1, contact: 1, ids: 1 },
      )
      .lean<DuplicateDoc[]>();
    return docs.map((d) => {
      const [lng, lat] = d.location?.coordinates ?? [];
      return {
        id: d._id.toString(),
        name: d.name,
        aliases: d.aliases ?? [],
        status: d.status,
        zoneId: d.zoneId?.toString(),
        location: lng !== undefined && lat !== undefined ? { lng, lat } : undefined,
        phone: d.contact?.phone ?? undefined,
        fanpage: d.contact?.fanpage ?? undefined,
        osmId: d.ids?.osmId ?? undefined,
        googlePlaceId: d.ids?.googlePlaceId ?? undefined,
      };
    });
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
