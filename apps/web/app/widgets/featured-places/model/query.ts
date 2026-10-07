import type { PlaceCategory } from '@ranhduong/contracts';

/** "Hay ngồi" chỉ đúng với quán, nên chỉ lấy cà phê và ăn uống. */
const FEATURED_CATEGORIES: PlaceCategory[] = ['cafe', 'food'];

/** "Chỗ dân ở đây hay ngồi": 6 quán theo thứ tự nổi bật của API. Đổi sang danh sách curate ở S14. */
export const FEATURED_QUERY = { category: FEATURED_CATEGORIES.join(','), limit: 6 };
