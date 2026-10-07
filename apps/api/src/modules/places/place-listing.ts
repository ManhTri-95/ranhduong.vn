import {
  CATEGORY_LABEL,
  needsOwnerConfirmation,
  type OpeningSlot,
  type PlaceCard,
  type PlaceCategory,
  type VerifySource,
} from '@ranhduong/contracts';
import { matchScore } from '@ranhduong/geo';

/** Các trường của Place cần cho thẻ và xếp hạng; repository chỉ đọc đúng các trường này. */
export interface ListedPlace {
  slug: string;
  name: string;
  aliases: string[];
  category: PlaceCategory;
  zoneId?: string;
  practicalNotes?: string;
  openingHours: OpeningSlot[];
  verifySource?: VerifySource;
  lastVerifiedAt?: Date;
  coverKey?: string;
}

/** Thứ tự "nổi bật": quán đã xác nhận trước, rồi xác minh gần nhất, chưa xác minh xếp cuối, cùng hạng theo slug. */
export function compareFeatured(a: ListedPlace, b: ListedPlace): number {
  const owner = Number(b.verifySource === 'owner') - Number(a.verifySource === 'owner');
  if (owner !== 0) return owner;
  const at = a.lastVerifiedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bt = b.lastVerifiedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (at !== bt) return bt > at ? 1 : -1;
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

/** Lọc theo từ khoá không dấu: khớp tên tốt hơn đứng trước, cùng mức khớp thì theo thứ tự nổi bật. */
export function searchPlaces(places: ListedPlace[], q: string): ListedPlace[] {
  return places
    .map((place) => ({ place, score: matchScore(q, place.name, [...place.aliases, CATEGORY_LABEL[place.category]]) }))
    .filter((ranked) => ranked.score > 0)
    .sort((a, b) => b.score - a.score || compareFeatured(a.place, b.place))
    .map((ranked) => ranked.place);
}

const NOTE_MAX = 90;

/** Câu đầu của dòng đầu trong ghi chú thực tế, tối đa 90 ký tự, cắt ở ranh giới từ. */
export function cardNote(text?: string): string | undefined {
  const firstLine = text?.trim().split(/\r?\n/)[0]?.trim();
  if (!firstLine) return undefined;
  const sentence = /^.*?[.!?…](?=\s|$)/.exec(firstLine)?.[0] ?? firstLine;
  if (sentence.length <= NOTE_MAX) return sentence;
  const cut = sentence.slice(0, NOTE_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:]+$/, '')}…`;
}

/** Đổi bản ghi thành thẻ công khai; tên cụm tra trong zoneNames (zoneId → tên). */
export function toPlaceCard(place: ListedPlace, zoneNames: ReadonlyMap<string, string>): PlaceCard {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    zoneName: place.zoneId ? zoneNames.get(place.zoneId) : undefined,
    note: cardNote(place.practicalNotes),
    openingHours: place.openingHours,
    unconfirmed: needsOwnerConfirmation(place),
    coverKey: place.coverKey,
  };
}
