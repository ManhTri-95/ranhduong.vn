import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parsePlaceCsv } from '@ranhduong/contracts';

describe('downloadable S21 CSV sample', () => {
  it('imports six clearly fictional drafts using every current category', async () => {
    const sample = await readFile(new URL('../../../../public/samples/dia-diem-mau.csv', import.meta.url), 'utf8');
    const rows = parsePlaceCsv(sample);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.status === 'ready' && row.name.includes('GIẢ'))).toBe(true);
    expect(rows.map((row) => row.draft?.place.category).sort()).toEqual(['activity', 'attraction', 'cafe', 'food', 'shop', 'stay']);
    expect(rows.every((row) => row.draft?.place.location === undefined && row.draft?.place.contact.phone === undefined)).toBe(true);
  });
});
