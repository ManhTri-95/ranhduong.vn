import { AdminPlaceSummary, CityPublic } from '@ranhduong/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { fetchCity } from '@/entities/city/api/city';
import { fetchPlaces } from '@/entities/place/api/places';
import { listLoadError, usePlaceList } from './use-place-list';

vi.mock('@/entities/city/api/city', () => ({ fetchCity: vi.fn() }));
vi.mock('@/entities/place/api/places', () => ({ fetchPlaces: vi.fn() }));

// Dữ liệu giả, tên rõ là giả.
const CITY = CityPublic.parse({
  slug: 'thanh-pho-gia-lap',
  name: 'Thành phố Giả Lập',
  accent: '#123456',
  center: { type: 'Point', coordinates: [0.5, 0.5] },
  mapBounds: [0, 0, 1, 1],
  zones: [{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }],
});
const row = (name: string) =>
  AdminPlaceSummary.parse({
    id: '0123456789abcdef01234567',
    status: 'draft',
    slug: 'quan-gia-lap',
    name,
    aliases: [],
    category: 'cafe',
    alsoCategories: [],
    photoCount: 0,
    activationIssues: [],
    updatedAt: '2026-10-08T03:00:00.000Z',
  });

function mount() {
  const list = effectScope().run(() => usePlaceList());
  if (!list) throw new Error('không dựng được danh sách');
  return list;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('usePlaceList', () => {
  it('tải danh sách và các cụm của thành phố', async () => {
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces).mockResolvedValue([row('Quán Giả Lập')]);
    const list = mount();
    await vi.waitFor(() => expect(list.load.value.kind).toBe('ready'));
    expect(list.rows.value.map((r) => r.name)).toEqual(['Quán Giả Lập']);
    expect(list.zones.value).toEqual([{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }]);
  });
  it('mất mạng: báo chưa kết nối, không phải lỗi đăng nhập', async () => {
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces).mockRejectedValue(new Error('Mất mạng giả lập'));
    const list = mount();
    await vi.waitFor(() => expect(list.load.value).toEqual({ kind: 'error', message: 'Chưa kết nối được máy chủ.', login: false }));
  });
  it('hai lần tải chồng nhau: kết quả về muộn của lần cũ không ghi đè lần mới', async () => {
    let resolveOld: ((rows: AdminPlaceSummary[]) => void) | undefined;
    vi.mocked(fetchCity).mockResolvedValue(CITY);
    vi.mocked(fetchPlaces)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce([row('Bản Mới Giả Lập')]);
    const list = mount();
    await list.reload();
    resolveOld?.([row('Bản Cũ Giả Lập')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(list.rows.value.map((r) => r.name)).toEqual(['Bản Mới Giả Lập']);
  });
});

describe('listLoadError', () => {
  it('hết phiên, mất mạng, lỗi khác', () => {
    expect(listLoadError({ status: 401, error: null })).toBe('Phiên đăng nhập đã hết, đăng nhập lại.');
    expect(listLoadError({ status: 0, error: null })).toBe('Chưa kết nối được máy chủ.');
    expect(listLoadError({ status: 500, error: null })).toBe('Chưa tải được danh sách địa điểm, thử lại.');
  });
});
