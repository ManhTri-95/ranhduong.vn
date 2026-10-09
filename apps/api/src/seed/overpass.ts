import { BBox, OverpassResponse } from '@ranhduong/contracts';
import { OSM_AMENITY_PATTERN, OSM_TOURISM_PATTERN } from '../modules/places/place-osm';

export function buildOverpassQuery(input: BBox): string {
  const [west, south, east, north] = BBox.parse(input);
  const bounds = `(${south},${west},${north},${east})`;
  return `[out:json][timeout:25];\n(\n` +
    `  nwr["amenity"~"${OSM_AMENITY_PATTERN}"]${bounds};\n` +
    `  nwr["tourism"~"${OSM_TOURISM_PATTERN}"]${bounds};\n` +
    `);\nout center;`;
}

export async function fetchOverpass(bounds: BBox, endpoint: string): Promise<OverpassResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'RanhDuong-OSM-Import/1.0 (https://ranhduong.vn)' },
    body: new URLSearchParams({ data: buildOverpassQuery(bounds) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Overpass trả HTTP ${response.status}. Thử lại sau hoặc đổi OVERPASS_URL.`);
  let data: unknown;
  try { data = await response.json(); }
  catch (err) { throw new Error('Overpass không trả JSON hợp lệ.', { cause: err }); }
  return OverpassResponse.parse(data);
}
