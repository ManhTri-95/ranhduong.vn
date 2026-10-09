import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { atlasSearchStage } from './place-search';
import { readFileSync } from 'node:fs';

const cityId = '0123456789abcdef01234567';

describe('S13 Atlas Search candidates', () => {
  it('normalizes decomposed Vietnamese Unicode in the index before folding accents', () => {
    const definition = JSON.parse(readFileSync('config/place-search-index.json', 'utf8')) as {
      analyzers: { tokenFilters: { type: string; normalizationForm?: string }[] }[];
    };
    const filters = definition.analyzers[0]?.tokenFilters ?? [];
    expect(filters[0]).toEqual({ type: 'icuNormalizer', normalizationForm: 'nfc' });
    expect(filters.findIndex((filter) => filter.type === 'asciiFolding')).toBeGreaterThan(0);
    expect(atlasSearchStage(cityId, 'Cà phê Mây'.normalize('NFD'), 'places-public'))
      .toEqual(atlasSearchStage(cityId, 'Cà phê Mây', 'places-public'));
  });
  it('normalizes accents and matches every token prefix across public fields', () => {
    const stage = atlasSearchStage(cityId, ' CÀ phê MÂY! ', 'places-public');
    expect(stage).toMatchObject({ $search: {
      index: 'places-public', compound: {
        filter: [
          { equals: { path: 'cityId', value: new Types.ObjectId(cityId) } },
          { equals: { path: 'status', value: 'active' } },
        ],
        must: ['ca', 'phe', 'may'].map((token) => ({ compound: {
          minimumShouldMatch: 1,
          should: expect.arrayContaining([{ wildcard: { path: ['name', 'aliases', 'tags'], query: `${token}*`, allowAnalyzedField: true } }]),
        } })),
      },
    } });
  });

  it('includes main/secondary category and translated tag matches', () => {
    const stage = JSON.stringify(atlasSearchStage(cityId, 'ca phe an sang', 'places-public'));
    expect(stage).toContain('"path":["category","alsoCategories"],"value":["cafe"]');
    expect(stage).toContain('"path":"tags","value":');
    expect(stage).toContain('an-sang');
  });

  it('ignores empty/punctuation-only input and never interpolates wildcard syntax', () => {
    expect(atlasSearchStage(cityId, ' (*?) ', 'places-public')).toBeNull();
    const stage = JSON.stringify(atlasSearchStage(cityId, 'Mây*?\\', 'places-public'));
    expect(stage).toContain('"query":"may*"');
    expect(stage).not.toContain('may*?');
  });
});
