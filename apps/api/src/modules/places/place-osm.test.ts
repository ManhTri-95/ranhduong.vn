import type { BBox } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { toOsmDraft } from './place-osm';

const BOUNDS: BBox = [108.34, 11.81, 108.62, 12.09];
const NODE = { type: 'node', id: 123, lat: 11.94, lon: 108.45, tags: { name: 'Cà phê Giả Lập', amenity: 'cafe' } };

describe('toOsmDraft', () => {
  it('maps a café node to GeoJSON without guessing missing facts', () => {
    expect(toOsmDraft(NODE, BOUNDS)).toEqual({ osmId: 'node/123', name: 'Cà phê Giả Lập', category: 'cafe', location: { type: 'Point', coordinates: [108.45, 11.94] } });
  });

  it.each(['way', 'relation'])('uses the %s center and includes its type in osmId', (type) => {
    expect(toOsmDraft({ type, id: 123, center: { lat: 11.94, lon: 108.45 }, tags: NODE.tags }, BOUNDS)).toMatchObject({ osmId: `${type}/123`, location: { type: 'Point', coordinates: [108.45, 11.94] } });
  });

  it.each(['restaurant', 'fast_food', 'food_court'])('maps amenity=%s to food', (amenity) => {
    expect(toOsmDraft({ ...NODE, tags: { name: 'Quán ăn Giả Lập', amenity } }, BOUNDS)?.category).toBe('food');
  });

  it.each(['attraction', 'museum', 'viewpoint', 'gallery', 'zoo', 'theme_park'])('maps tourism=%s to attraction', (tourism) => {
    expect(toOsmDraft({ ...NODE, tags: { name: 'Điểm tham quan Giả Lập', tourism } }, BOUNDS)?.category).toBe('attraction');
  });

  it('prefers a provided Vietnamese name and builds an address only from provided tags', () => {
    expect(toOsmDraft({ ...NODE, tags: { ...NODE.tags, 'name:vi': ' Tên Việt Giả Lập ', 'addr:housenumber': '12', 'addr:street': 'Đường Giả Lập', 'addr:city': 'Thành phố Giả Lập' } }, BOUNDS)).toMatchObject({ name: 'Tên Việt Giả Lập', address: '12 Đường Giả Lập, Thành phố Giả Lập' });
  });

  it.each([
    { ...NODE, id: 0 },
    { ...NODE, tags: { amenity: 'cafe' } },
    { ...NODE, tags: { name: ' ', amenity: 'cafe' } },
    { ...NODE, tags: { name: 'Khách sạn Giả Lập', tourism: 'hotel' } },
    { ...NODE, lat: undefined },
    { ...NODE, lat: 100 },
    { ...NODE, lon: 109 },
    { type: 'way', id: 123, tags: NODE.tags },
  ])('skips invalid, unnamed, unsupported or out-of-bounds data: %j', (input) => {
    expect(toOsmDraft(input, BOUNDS)).toBeNull();
  });
});
