import { formatTripLength, TRANSPORT_LABEL, type TicketData, type TicketFormat, type TicketStop } from '@ranhduong/contracts';
import type { CSSProperties } from 'satori/jsx';
import { renderSVG } from 'uqr';
import type { TicketColors } from './ticket-assets';
import { ticketRows } from './ticket-data';

export type TicketChild = TicketNode | string;
export interface TicketNode {
  type: string;
  props: { style?: CSSProperties; src?: string; width?: number; height?: number; children?: TicketChild | TicketChild[] };
}

/**
 * Tạo phần tử cho Satori. Không dùng createElement của satori/jsx: nó luôn đặt children là mảng, mà Satori 0.33.5
 * coi mảng (kể cả một phần tử) là nhiều con và bắt `display: flex`. Không có con thì bỏ trống, một con thì truyền thẳng.
 */
export function h(type: string, props: Omit<TicketNode['props'], 'children'>, ...children: (TicketChild | null)[]): TicketNode {
  const kids = children.filter((child): child is TicketChild => child !== null);
  if (kids.length === 0) return { type, props };
  return { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
}

const LORA = 'Lora';
const BODY = 'Be Vietnam Pro';
const HAND = 'Patrick Hand';
/** Spec UI mục 3 (giọng văn), mục 9 (cuống vé). */
const CAPTION = 'Mình đi theo lịch này nè, bạn đi chung không?';

export function ticketQrDataUri(url: string, colors: TicketColors): string {
  const svg = renderSVG(url, { ecc: 'M', border: 1, blackColor: colors.ink, whiteColor: colors.paperRaised });
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const eyebrow = (data: TicketData) => `VÉ LỊCH TRÌNH · ${formatTripLength(data.days).toLocaleUpperCase('vi')}`;
const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('vi') + text.slice(1);

interface StopSizes { row: number; time: number; timeWidth: number; dot: number; dotFont: number; name: number; label: number; more: number }
const STORY_SIZES: StopSizes = { row: 84, time: 28, timeWidth: 104, dot: 48, dotFont: 24, name: 34, label: 24, more: 28 };
const OG_SIZES: StopSizes = { row: 50, time: 24, timeWidth: 84, dot: 34, dotFont: 18, name: 28, label: 0, more: 24 };

/** Danh sách điểm theo giờ nối nét đứt; điểm cuối chuyến màu nhấn khi không còn "+ x điểm". */
function stopList(rows: { stops: TicketStop[]; more: number; dayLabels: boolean }, s: StopSizes, c: TicketColors): TicketChild[] {
  if (rows.stops.length === 0) {
    return [h('div', { style: { fontFamily: BODY, fontWeight: 600, fontSize: s.more, color: c.inkSoft } }, 'Các điểm ghé đang được cập nhật')];
  }
  const items: TicketChild[] = [];
  rows.stops.forEach((stop, i) => {
    if (rows.dayLabels && stop.day !== rows.stops[i - 1]?.day) {
      items.push(h('div', { style: { height: 44, display: 'flex', alignItems: 'center', fontFamily: BODY, fontWeight: 700, fontSize: s.label, letterSpacing: 3, color: c.inkSoft } }, `NGÀY ${stop.day}`));
    }
    const last = rows.more === 0 && i === rows.stops.length - 1;
    const linked = rows.stops[i + 1]?.day === stop.day;
    items.push(h('div', { style: { display: 'flex', height: s.row } },
      h('div', { style: { width: s.timeWidth, height: s.dot, display: 'flex', alignItems: 'center', fontFamily: BODY, fontWeight: 600, fontSize: s.time, color: c.inkSoft } }, stop.start),
      h('div', { style: { width: s.dot, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        h('div', { style: { width: s.dot, height: s.dot, borderRadius: s.dot / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: last ? c.accent : c.ink, color: last ? c.ink : c.paperRaised, fontFamily: BODY, fontWeight: 700, fontSize: s.dotFont } }, String(stop.number)),
        linked ? h('div', { style: { width: 0, height: s.row - s.dot, borderLeft: `3px dashed ${c.ink}` } }) : null),
      h('div', { style: { display: 'block', flex: 1, marginLeft: Math.round(s.dot / 2.4), fontFamily: BODY, fontWeight: 700, fontSize: s.name,
        lineHeight: s.dot / s.name, color: c.ink, lineClamp: 1 } }, stop.name)));
  });
  if (rows.more > 0) {
    items.push(h('div', { style: { display: 'flex', height: s.dot + 8, alignItems: 'center', paddingLeft: s.timeWidth, fontFamily: BODY, fontWeight: 700, fontSize: s.more, color: c.inkSoft } }, `+ ${rows.more} điểm`));
  }
  return items;
}

function chip(label: string, background: string, c: TicketColors): TicketNode {
  return h('div', { style: { display: 'flex', marginRight: 12, padding: '8px 20px', borderRadius: 999, backgroundColor: background,
    fontFamily: BODY, fontWeight: 700, fontSize: 26, color: c.ink } }, label);
}

function story(data: TicketData, c: TicketColors): TicketNode {
  const notch = (side: 'left' | 'right') => h('div', { style: { position: 'absolute', top: 0, [side]: -36, width: 72, height: 72, borderRadius: 36, backgroundColor: c.ink } });
  return h('div', { style: { width: 1080, height: 1920, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '72px', backgroundColor: c.ink } },
    h('div', { style: { display: 'flex', flexDirection: 'column' } },
      h('div', { style: { fontFamily: LORA, fontWeight: 700, fontSize: 56, color: c.paperRaised } }, 'Rành Đường'),
      h('div', { style: { marginTop: 4, fontFamily: BODY, fontWeight: 600, fontSize: 30, color: c.mist } }, data.cityName)),
    h('div', { style: { marginTop: 40, display: 'flex', flexDirection: 'column', borderRadius: 32, backgroundColor: c.paperRaised } },
      h('div', { style: { display: 'flex', flexDirection: 'column', padding: '56px 56px 32px' } },
        h('div', { style: { fontFamily: BODY, fontWeight: 700, fontSize: 26, letterSpacing: 3, color: c.inkSoft } }, eyebrow(data)),
        h('div', { style: { display: 'block', marginTop: 16, fontFamily: LORA, fontWeight: 700, fontSize: 64, lineHeight: 1.12, color: c.ink, lineClamp: 3 } }, data.title),
        h('div', { style: { display: 'flex', marginTop: 24 } },
          data.season ? chip(data.season, c.accent, c) : null,
          chip(capitalize(TRANSPORT_LABEL[data.transport]), c.mist, c))),
      h('div', { style: { display: 'flex', flexDirection: 'column', padding: '0 56px' } }, ...stopList(ticketRows(data, 'story'), STORY_SIZES, c)),
      h('div', { style: { position: 'relative', display: 'flex', alignItems: 'center', height: 72, marginTop: 16 } },
        notch('left'),
        h('div', { style: { flex: 1, height: 0, margin: '0 56px', borderTop: `3px dashed ${c.line}` } }),
        notch('right')),
      h('div', { style: { display: 'flex', alignItems: 'center', padding: '24px 56px 56px' } },
        h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', paddingRight: 32 } },
          h('div', { style: { fontFamily: HAND, fontSize: 42, lineHeight: 1.25, color: c.ink } }, CAPTION),
          h('div', { style: { marginTop: 20, fontFamily: BODY, fontWeight: 600, fontSize: 24, color: c.inkSoft, wordBreak: 'break-all' } }, data.shortLink)),
        h('div', { style: { display: 'flex', padding: 12, border: `2px solid ${c.line}`, borderRadius: 16, backgroundColor: c.paperRaised } },
          h('img', { src: ticketQrDataUri(data.qrUrl, c), width: 232, height: 232 })))));
}

function og(data: TicketData, c: TicketColors): TicketNode {
  return h('div', { style: { width: 1200, height: 630, display: 'flex', padding: 56, backgroundColor: c.ink } },
    h('div', { style: { flex: 1, display: 'flex', borderRadius: 28, backgroundColor: c.paperRaised } },
      h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: 44 } },
        h('div', { style: { fontFamily: BODY, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: c.inkSoft } }, eyebrow(data)),
        h('div', { style: { display: 'block', marginTop: 12, fontFamily: LORA, fontWeight: 700, fontSize: 52, lineHeight: 1.12, color: c.ink, lineClamp: 2 } }, data.title),
        h('div', { style: { display: 'flex', flexDirection: 'column', marginTop: 24 } }, ...stopList(ticketRows(data, 'og'), OG_SIZES, c))),
      h('div', { style: { width: 0, margin: '28px 0', borderLeft: `3px dashed ${c.line}` } }),
      h('div', { style: { width: 340, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 40 } },
        h('div', { style: { display: 'flex', flexDirection: 'column' } },
          h('div', { style: { fontFamily: LORA, fontWeight: 700, fontSize: 38, color: c.ink } }, 'Rành Đường'),
          h('div', { style: { marginTop: 4, fontFamily: BODY, fontWeight: 600, fontSize: 24, color: c.inkSoft } }, data.cityName)),
        h('div', { style: { fontFamily: BODY, fontWeight: 600, fontSize: 22, color: c.inkSoft } }, data.shortLink.split('/')[0] ?? data.shortLink))));
}

/** Bố cục vé theo Spec UI mục 9; số đo ghi ở plan S30 Task 4. */
export function ticketElement(data: TicketData, format: TicketFormat, colors: TicketColors): TicketNode {
  return format === 'story' ? story(data, colors) : og(data, colors);
}
