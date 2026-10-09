import { CATEGORY_LABEL, TAG_LABEL } from '@ranhduong/contracts';
import { searchKey } from '@ranhduong/geo';
import { Types, type PipelineStage } from 'mongoose';

/** Atlas supplies candidates; current DB records and searchPlaces still enforce public visibility and ranking. */
export function atlasSearchStage(cityId: string, q: string, index: string): PipelineStage | null {
  const key = searchKey(q);
  if (!key) return null;
  const startsWith = (label: string, token: string) => searchKey(label).split(' ').some((word) => word.startsWith(token));
  return { $search: {
    index,
    compound: {
      filter: [
        { equals: { path: 'cityId', value: new Types.ObjectId(cityId) } },
        { equals: { path: 'status', value: 'active' } },
      ],
      must: key.split(' ').map((token) => {
        const categories = Object.entries(CATEGORY_LABEL).filter(([, label]) => startsWith(label, token)).map(([category]) => category);
        const tags = Object.entries(TAG_LABEL).filter(([, label]) => startsWith(label, token)).map(([tag]) => tag);
        return { compound: {
          minimumShouldMatch: 1,
          should: [
            { wildcard: { path: ['name', 'aliases', 'tags'], query: `${token}*`, allowAnalyzedField: true } },
            ...(categories.length ? [{ in: { path: ['category', 'alsoCategories'], value: categories } }] : []),
            ...(tags.length ? [{ in: { path: 'tags', value: tags } }] : []),
          ],
        } };
      }),
    },
  } };
}
