import { Injectable, Logger } from '@nestjs/common';
import { TICKET_SIZE, type TicketData, type TicketFormat } from '@ranhduong/contracts';
import { Resvg } from '@resvg/resvg-js';
import satori, { type Font } from 'satori';
import { loadTicketFonts, readDefaultOg, readTokensCss, ticketColors } from './ticket-assets';
import { ticketElement } from './ticket-layout';

export interface TicketRenderAssets { fonts: Font[]; tokensCss: string }

/**
 * Satori dựng SVG (chữ đã thành path nên resvg không cần font hệ thống), resvg chuyển sang PNG. Chạy trong worker.
 * Glyph không có trong font (thường là emoji) được báo qua onMissingGlyph và bỏ qua, không làm hỏng vé.
 */
export async function renderTicketPng(data: TicketData, format: TicketFormat, assets: TicketRenderAssets,
  onMissingGlyph: (code: string, segment: string) => void): Promise<Buffer> {
  const { width, height } = TICKET_SIZE[format];
  const svg = await satori(ticketElement(data, format, ticketColors(assets.tokensCss, data.accent)), {
    width, height, fonts: assets.fonts,
    loadAdditionalAsset: async (code, segment) => { onMissingGlyph(code, segment); return []; },
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false } }).render().asPng();
}

@Injectable()
export class TicketRenderer {
  private readonly logger = new Logger(TicketRenderer.name);
  private assets?: TicketRenderAssets;
  private fallback?: Buffer;

  /** Font và tokens nạp ở lần dựng đầu, nên tiến trình API (chỉ cần ảnh mặc định) không nạp font. */
  render(data: TicketData, format: TicketFormat): Promise<Buffer> {
    this.assets ??= { fonts: loadTicketFonts(), tokensCss: readTokensCss() };
    return renderTicketPng(data, format, this.assets, (code, segment) => this.logger.warn(`Vé thiếu glyph ${code}: ${segment}`));
  }

  defaultOg(): Buffer {
    this.fallback ??= readDefaultOg();
    return this.fallback;
  }
}
