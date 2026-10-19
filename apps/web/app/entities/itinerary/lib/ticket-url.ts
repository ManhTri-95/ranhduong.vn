import type { TicketFormat } from '@ranhduong/contracts';

/**
 * Ảnh vé của lịch trình mẫu (S30), theo slug: không có ObjectId. Dùng địa chỉ API công khai, vì crawler Zalo/Messenger
 * và trình duyệt đều tải trực tiếp.
 */
export function templateTicketUrl(apiBase: string, citySlug: string, slug: string, format: TicketFormat): string {
  return `${apiBase.replace(/\/+$/, '')}/cities/${citySlug}/itineraries/templates/${slug}/ticket.png?format=${format}`;
}

export function ticketFileName(slug: string): string {
  return `ve-lich-trinh-${slug}.png`;
}
