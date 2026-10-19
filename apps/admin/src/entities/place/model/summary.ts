import { activationIssues, ActivationIssueCode, type AdminPlace, type AdminPlaceSummary } from '@ranhduong/contracts';

/** Địa điểm đầy đủ (form) → dạng dòng danh sách, để form dùng lại hộp thoại thao tác của danh sách. */
export function toPlaceSummary(place: AdminPlace): AdminPlaceSummary {
  const codes = new Set(
    activationIssues({ location: place.location, openingHours: place.openingHours, verifySource: place.verifySource, photos: place.photos }).map((issue) => issue.code),
  );
  return {
    id: place.id,
    status: place.status,
    slug: place.slug,
    name: place.name,
    aliases: place.aliases,
    category: place.category,
    alsoCategories: place.alsoCategories,
    zone: place.zone,
    visitDurationMin: place.visitDurationMin,
    bestTime: place.bestTime,
    verifySource: place.verifySource,
    lastVerifiedAt: place.lastVerifiedAt,
    photoCount: place.photos.length,
    activationIssues: ActivationIssueCode.options.filter((code) => codes.has(code)),
    updatedAt: place.updatedAt,
  };
}
