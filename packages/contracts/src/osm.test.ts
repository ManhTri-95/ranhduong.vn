import { describe, expect, it } from 'vitest';
import { OsmDraft, OsmElement, OsmId, OverpassResponse } from './osm.js';

describe('OSM import contracts', () => {
  it('keeps the element type in the identity and rejects ambiguous numeric IDs', () => {
    for (const id of ['node/123', 'way/123', 'relation/123']) expect(OsmId.parse(id)).toBe(id);
    for (const id of ['123', 'node/0', 'area/123', 'node/-1']) expect(OsmId.safeParse(id).success).toBe(false);
  });

  it('validates identity and coordinate ranges without requiring every element to have a name', () => {
    expect(OsmElement.safeParse({ type: 'way', id: 123, center: { lat: 11.94, lon: 108.45 } }).success).toBe(true);
    expect(OsmElement.safeParse({ type: 'node', id: -1 }).success).toBe(false);
    expect(OsmElement.safeParse({ type: 'node', id: 123, lat: 91, lon: 108.45 }).success).toBe(false);
  });

  it('rejects partial Overpass results before any element is imported', () => {
    expect(OverpassResponse.safeParse({ elements: [], remark: 'runtime error: Query timed out' }).success).toBe(false);
    expect(OverpassResponse.safeParse({ error: 'bad request' }).success).toBe(false);
    expect(OverpassResponse.parse({ elements: [], version: 0.6 })).toEqual({ elements: [] });
  });

  it('requires real coordinates and a name that fits the admin form', () => {
    const input = { osmId: 'node/123', name: 'Quán Giả Lập', category: 'cafe', location: { type: 'Point', coordinates: [108.45, 11.94] } };
    expect(OsmDraft.parse(input)).toEqual(input);
    expect(OsmDraft.safeParse({ ...input, name: ' ' }).success).toBe(false);
    expect(OsmDraft.safeParse({ ...input, name: 'a'.repeat(121) }).success).toBe(false);
    expect(OsmDraft.safeParse({ ...input, location: undefined }).success).toBe(false);
  });
});
