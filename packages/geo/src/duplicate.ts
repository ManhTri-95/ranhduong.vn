import { haversineMeters, type LatLng } from './distance.js';
import { jaroWinkler } from './jaro-winkler.js';
import { normalizeName } from './normalize.js';

/** Bán kính lấy ứng viên theo vị trí (technical-design mục 9). */
export const DUPLICATE_RADIUS_M = 150;
/** Cùng tên chuẩn hoá mà cách xa hơn thì là chi nhánh khác. */
export const BRANCH_DISTANCE_M = 300;
/** Ngưỡng điểm: từ 0,85 rất có thể trùng, từ 0,6 có thể trùng. */
export const DUPLICATE_LIKELY = 0.85;
export const DUPLICATE_POSSIBLE = 0.6;
/** Luật thêm (decisions 2026-10-08): trong bán kính, tên chuẩn hoá giống từ mức này thì vẫn báo "có thể trùng". */
export const NAME_NEAR_SIMILARITY = 0.85;

export interface DuplicateSubject {
  name: string;
  location?: LatLng;
  /** Đã chuẩn hoá dạng +84… */
  phone?: string;
  fanpage?: string;
  osmId?: string;
  googlePlaceId?: string;
}

export interface DuplicateCandidate<T> extends DuplicateSubject {
  /** Dữ liệu của người gọi đi kèm kết quả (ví dụ dòng DB). */
  ref: T;
  aliases: readonly string[];
}

export type DuplicateLevel = 'likely' | 'possible';

export interface DuplicateMatch<T> {
  ref: T;
  score: number;
  level: DuplicateLevel;
  distanceM?: number;
}

/** Chuẩn hoá link fanpage, website để so: bỏ giao thức, www., m., dấu / cuối, query và #; chữ thường. */
export function normalizeUrlForMatch(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^(www|m|mobile)\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

const same = (a: string | undefined, b: string | undefined) => a !== undefined && a !== '' && a === b;

/** Trùng số điện thoại, fanpage, osmId hoặc googlePlaceId. */
function idMatch(a: DuplicateSubject, b: DuplicateSubject): boolean {
  if (same(a.phone, b.phone) || same(a.osmId, b.osmId) || same(a.googlePlaceId, b.googlePlaceId)) return true;
  return a.fanpage !== undefined && b.fanpage !== undefined && same(normalizeUrlForMatch(a.fanpage), normalizeUrlForMatch(b.fanpage));
}

/** Jaro-Winkler giữa tên chuẩn hoá, lấy max với từng alias. Tên chỉ gồm từ chung (chuẩn hoá ra rỗng) thì không so. */
function nameSimilarity(name: string, candidate: { name: string; aliases: readonly string[] }): number {
  const a = normalizeName(name);
  if (!a) return 0;
  const others = [candidate.name, ...candidate.aliases].map(normalizeName).filter(Boolean);
  return Math.max(0, ...others.map((b) => jaroWinkler(a, b)));
}

/**
 * Điểm trùng một ứng viên (technical-design mục 9): 0,5 × trùng ID + 0,4 × tên giống + 0,1 × gần.
 * null khi không phải ứng viên (xa hơn 150 m và không trùng ID) hoặc là chi nhánh (cùng tên, cách trên 300 m).
 */
export function scoreDuplicate<T>(
  subject: DuplicateSubject,
  candidate: DuplicateCandidate<T>,
): { score: number; nameSim: number; distanceM?: number } | null {
  const distanceM = subject.location && candidate.location ? haversineMeters(subject.location, candidate.location) : undefined;
  const ids = idMatch(subject, candidate);
  if (!ids && (distanceM === undefined || distanceM > DUPLICATE_RADIUS_M)) return null;
  const subjectNorm = normalizeName(subject.name);
  const sameName = subjectNorm !== '' && subjectNorm === normalizeName(candidate.name);
  if (sameName && distanceM !== undefined && distanceM > BRANCH_DISTANCE_M) return null;
  const nameSim = nameSimilarity(subject.name, candidate);
  const near = distanceM === undefined ? 0 : Math.max(0, 1 - distanceM / DUPLICATE_RADIUS_M);
  return { score: 0.5 * (ids ? 1 : 0) + 0.4 * nameSim + 0.1 * near, nameSim, distanceM };
}

function levelOf({ score, nameSim, distanceM }: { score: number; nameSim: number; distanceM?: number }): DuplicateLevel | null {
  if (score >= DUPLICATE_LIKELY) return 'likely';
  if (score >= DUPLICATE_POSSIBLE) return 'possible';
  if (distanceM !== undefined && distanceM <= DUPLICATE_RADIUS_M && nameSim >= NAME_NEAR_SIMILARITY) return 'possible';
  return null;
}

/** Các ứng viên nghi trùng, điểm cao trước. */
export function findDuplicates<T>(subject: DuplicateSubject, candidates: readonly DuplicateCandidate<T>[]): DuplicateMatch<T>[] {
  const matches: DuplicateMatch<T>[] = [];
  for (const candidate of candidates) {
    const scored = scoreDuplicate(subject, candidate);
    const level = scored ? levelOf(scored) : null;
    if (scored && level) matches.push({ ref: candidate.ref, score: scored.score, level, distanceM: scored.distanceM });
  }
  return matches.sort((a, b) => b.score - a.score);
}
