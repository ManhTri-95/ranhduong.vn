import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ItineraryTemplateDetail } from '@ranhduong/contracts';
import { templateTicketData } from '../modules/tickets/ticket-data';
import { TicketRenderer } from '../modules/tickets/ticket-renderer';

/**
 * S30: dựng vé mẫu từ dữ liệu giả để xem bố cục bằng mắt; chạy sau build:
 * `pnpm --filter @ranhduong/api ticket:sample --out <thư mục>`. Không đọc database hay R2.
 */
function sample(slug: string, title: string, season: string, days: number[], nameLength = 0): ItineraryTemplateDetail {
  return ItineraryTemplateDetail.parse({
    slug, title, description: '', season, style: '', seoTitle: '', seoDescription: '', transport: 'motorbike', pace: 'relaxed',
    days: days.map((count, d) => ({ day: d + 1, stops: Array.from({ length: count }, (_, s) => ({
      key: `${d + 1}-${s + 1}`, number: s + 1, start: `${String(7 + s * 2).padStart(2, '0')}:${s % 2 ? '30' : '00'}`, end: '23:00',
      travelMinFromPrev: 0, note: '', kind: s === 2 ? 'meal' : 'visit',
      place: { slug: `quan-gia-lap-${d}-${s}`, name: nameLength ? `Điểm ghé Giả Lập rất dài ${d + 1}.${s + 1} `.repeat(8).slice(0, nameLength) : `Quán Giả Lập ${d + 1}.${s + 1}`,
        category: 'cafe', alsoCategories: [], unconfirmed: true },
    })) })),
  });
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { out: { type: 'string' } } });
  if (!values.out) throw new Error('Thiếu --out <thư mục>');
  await mkdir(values.out, { recursive: true });
  const ctx = { cityName: 'Thành phố Giả Lập', citySlug: 'da-lat', accent: '#E9B824', siteUrl: 'https://ranhduong.vn' };
  const renderer = new TicketRenderer();
  const normal = templateTicketData(sample('lich-trinh-gia-lap', 'Hai ngày Giả Lập đi chậm, ngắm đồi và ăn đặc sản', 'Mùa dã quỳ Giả Lập', [3, 2]), ctx);
  const long = templateTicketData(sample('lich-trinh-gia-lap-rat-dai', 'Lịch trình Giả Lập '.repeat(11).slice(0, 198) + '🌼', 'Mùa Giả Lập', [3, 3, 3, 3, 3], 120), ctx);
  const files: [string, Promise<Buffer>][] = [
    ['story.png', renderer.render(normal, 'story')], ['og.png', renderer.render(normal, 'og')],
    ['story-dai.png', renderer.render(long, 'story')], ['og-dai.png', renderer.render(long, 'og')],
  ];
  for (const [name, png] of files) await writeFile(join(values.out, name), await png);
  console.log(`Đã ghi ${files.length} vé mẫu vào ${values.out}`);
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
