import { AdminPlace, type PlaceCategory, type PlaceEditInput, type PlaceStatus, type VerifySource } from '@ranhduong/contracts';
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
  zoneId?: Types.ObjectId | null;
  tags?: string[];
  location?: { type: 'Point'; coordinates: number[] } | null;
  address?: string | null;
  openingHours?: { day: number; open: string; close: string }[];
  visitDurationMin?: number | null;
  bestTime?: string[];
  indoor?: boolean | null;
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
    indoor: input.indoor,
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
    zone: row.zoneId ? zoneSlugById.get(row.zoneId.toString()) : undefined,
    tags: row.tags ?? [],
    location: row.location ? { type: 'Point', coordinates: row.location.coordinates } : undefined,
    address: opt(row.address),
    openingHours: (row.openingHours ?? []).map(({ day, open, close }) => ({ day, open, close })),
    visitDurationMin: opt(row.visitDurationMin),
    bestTime: row.bestTime ?? [],
    indoor: opt(row.indoor),
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
