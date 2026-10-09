import { GeoPoint, needsOwnerConfirmation, PlaceContact, PlaceDetail, PlacePhoto } from '@ranhduong/contracts';
import type { Types } from 'mongoose';
import type { EditRow } from './place-edit';

export interface DetailRow extends EditRow {
  slugHistory?: string[];
  mergedInto?: Types.ObjectId | null;
}

/** Validate legacy optional values and strip all non-public fields at the HTTP boundary. */
export function toPlaceDetail(row: DetailRow, zone?: { slug: string; name: string }): PlaceDetail {
  const location = GeoPoint.safeParse(row.location);
  const contact = Object.fromEntries(Object.entries(row.contact ?? {}).flatMap(([key, value]) => {
    const schema = PlaceContact.shape[key as keyof typeof PlaceContact.shape];
    const parsed = schema?.safeParse(value);
    return parsed?.success && parsed.data ? [[key, parsed.data]] : [];
  }));
  const photos = (row.photos ?? []).flatMap((photo) => {
    const parsed = PlacePhoto.safeParse(photo);
    return parsed.success ? [parsed.data] : [];
  });
  return PlaceDetail.parse({
    id: row._id.toString(), slug: row.slug, name: row.name, status: row.status,
    category: row.category, alsoCategories: row.alsoCategories ?? [], tags: row.tags ?? [],
    location: location.success ? location.data : undefined, address: row.address ?? undefined,
    openingHours: (row.openingHours ?? []).map(({ day, open, close }) => ({ day, open, close })),
    visitDurationMin: row.visitDurationMin ?? undefined, bestTime: row.bestTime ?? [],
    cover: row.cover ?? undefined, priceLevel: row.priceLevel ?? undefined, transport: row.transport ?? [],
    practicalNotes: row.practicalNotes ?? undefined, contact, photos,
    googlePlaceId: row.ids?.googlePlaceId ?? undefined,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    unconfirmed: needsOwnerConfirmation({ category: row.category, verifySource: row.verifySource ?? undefined }),
    zoneSlug: zone?.slug, zoneName: zone?.name,
  });
}
