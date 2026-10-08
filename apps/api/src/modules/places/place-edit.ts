import {
  activationIssues,
  AdminPlace,
  AdminPlaceSummary,
  type PlaceCategory,
  type PlaceCover,
  type PlaceEditInput,
  type PlaceStatus,
  type VerifySource,
} from '@ranhduong/contracts';
import type { LatLng } from '@ranhduong/geo';
import { Types } from 'mongoose';

/** Document địa điểm đọc bằng `.lean()` để sửa trong admin; trường tuỳ chọn có thể vắng hoặc null. */
export interface EditRow {
  _id: Types.ObjectId;
  cityId: Types.ObjectId;
  status: PlaceStatus;
  slug: string;
  name: string;
  aliases?: string[];
  category: PlaceCategory;
  alsoCategories?: PlaceCategory[];
  zoneId?: Types.ObjectId | null;
  tags?: string[];
  location?: { type: 'Point'; coordinates: number[] } | null;
  address?: string | null;
  openingHours?: { day: number; open: string; close: string }[];
  visitDurationMin?: number | null;
  bestTime?: string[];
  cover?: PlaceCover | null;
  priceLevel?: number | null;
  transport?: string[];
  practicalNotes?: string | null;
  contact?: { phone?: string | null; fanpage?: string | null; website?: string | null } | null;
  ids?: { googlePlaceId?: string | null; osmId?: string | null } | null;
  photos?: { key: string; source?: string | null; credit?: string | null; license?: string | null }[];
  verifySource?: VerifySource | null;
  lastVerifiedAt?: Date | null;
  /** Document chèn thẳng (không qua Mongoose) có thể không có. */
  updatedAt?: Date | null;
}

/** Một địa điểm để so trùng (technical-design mục 9). */
export interface DuplicateRow {
  id: string;
  name: string;
  aliases: string[];
  status: PlaceStatus;
  zoneId?: string;
  location?: LatLng;
  phone?: string;
  fanpage?: string;
  osmId?: string;
  googlePlaceId?: string;
}

/** Update của PUT: $set trường có giá trị, $unset trường tuỳ chọn để trống. */
export interface PlaceUpdate {
  $set: Record<string, unknown>;
  $unset: Record<string, ''>;
}

const opt = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

/**
 * Trường form thành update MongoDB (PUT thay toàn bộ phần form quản lý): trường tuỳ chọn không gửi thì $unset,
 * contact thay nguyên object. Ảnh, trạng thái, nguồn tạo không nằm ở đây. `$set` cũng là thân document khi tạo nháp.
 */
export function editUpdate(input: PlaceEditInput, derived: { nameNorm: string; slug: string; zoneId?: string }): PlaceUpdate {
  const contact = Object.fromEntries(Object.entries(input.contact).filter(([, value]) => value !== undefined));
  const set: Record<string, unknown> = {
    name: input.name,
    nameNorm: derived.nameNorm,
    slug: derived.slug,
    aliases: input.aliases,
    category: input.category,
    alsoCategories: input.alsoCategories,
    tags: input.tags,
    openingHours: input.openingHours,
    bestTime: input.bestTime,
    transport: input.transport,
    contact,
  };
  const optional: Record<string, unknown> = {
    zoneId: derived.zoneId === undefined ? undefined : new Types.ObjectId(derived.zoneId),
    location: input.location,
    address: input.address,
    visitDurationMin: input.visitDurationMin,
    cover: input.cover,
    priceLevel: input.priceLevel,
    practicalNotes: input.practicalNotes,
    verifySource: input.verifySource,
  };
  const unset: Record<string, ''> = {};
  for (const [path, value] of Object.entries(optional)) {
    if (value === undefined) unset[path] = '';
    else set[path] = value;
  }
  return { $set: set, $unset: unset };
}

/** Document → AdminPlace: id cụm thành slug, bỏ null, ngày giờ ISO. Không có updatedAt thì lấy thời điểm tạo trong _id. */
export function toAdminPlace(row: EditRow, zoneSlugById: ReadonlyMap<string, string>): AdminPlace {
  return AdminPlace.parse({
    id: row._id.toString(),
    status: row.status,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [],
    category: row.category,
    alsoCategories: row.alsoCategories ?? [],
    zone: row.zoneId ? zoneSlugById.get(row.zoneId.toString()) : undefined,
    tags: row.tags ?? [],
    location: row.location ? { type: 'Point', coordinates: row.location.coordinates } : undefined,
    address: opt(row.address),
    openingHours: (row.openingHours ?? []).map(({ day, open, close }) => ({ day, open, close })),
    visitDurationMin: opt(row.visitDurationMin),
    bestTime: row.bestTime ?? [],
    cover: opt(row.cover),
    priceLevel: opt(row.priceLevel),
    transport: row.transport ?? [],
    practicalNotes: opt(row.practicalNotes),
    contact: { phone: opt(row.contact?.phone), fanpage: opt(row.contact?.fanpage), website: opt(row.contact?.website) },
    ids: { googlePlaceId: opt(row.ids?.googlePlaceId), osmId: opt(row.ids?.osmId) },
    photos: (row.photos ?? []).map((p) => ({ key: p.key, source: opt(p.source), credit: opt(p.credit), license: opt(p.license) })),
    verifySource: opt(row.verifySource),
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    updatedAt: (row.updatedAt ?? row._id.getTimestamp()).toISOString(),
  });
}

/** Ngày giờ ISO từ giá trị đọc trong DB: Date, hoặc chuỗi/số khi bị sửa tay; không đọc được thì undefined. */
function toIso(value: unknown): string | undefined {
  if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Các trường đọc cho một dòng danh sách admin (S07); ảnh đọc đủ để kiểm nguồn. Ngày giờ để unknown vì document sửa tay
 * trong DB có thể lưu chuỗi.
 */
export type SummaryRow = Pick<
  EditRow,
  '_id' | 'status' | 'slug' | 'name' | 'aliases' | 'category' | 'alsoCategories' | 'zoneId' | 'location' | 'openingHours' | 'verifySource' | 'photos'
> & { lastVerifiedAt?: unknown; updatedAt?: unknown };

/** Document → một dòng danh sách admin: id cụm thành slug, số ảnh, mã điều kiện kích hoạt còn thiếu (mỗi mã một lần). */
export function toAdminPlaceSummary(row: SummaryRow, zoneSlugById: ReadonlyMap<string, string>): AdminPlaceSummary {
  const issues = activationIssues({
    location: row.location,
    openingHours: row.openingHours ?? [],
    verifySource: row.verifySource,
    photos: row.photos ?? [],
  });
  return AdminPlaceSummary.parse({
    id: row._id.toString(),
    status: row.status,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases ?? [],
    category: row.category,
    alsoCategories: row.alsoCategories ?? [],
    zone: row.zoneId ? zoneSlugById.get(row.zoneId.toString()) : undefined,
    verifySource: opt(row.verifySource),
    lastVerifiedAt: toIso(row.lastVerifiedAt),
    photoCount: row.photos?.length ?? 0,
    activationIssues: [...new Set(issues.map((issue) => issue.code))],
    updatedAt: toIso(row.updatedAt) ?? row._id.getTimestamp().toISOString(),
  });
}
