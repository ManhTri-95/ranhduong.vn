import type { TemplateDayInput } from '@ranhduong/contracts';
const copy = (days: readonly TemplateDayInput[]): TemplateDayInput[] => days.map((day) => ({ ...day, stops: day.stops.map((stop) => ({ ...stop })) }));
export function addStop(days: readonly TemplateDayInput[], dayIndex: number, placeId: string, key = crypto.randomUUID()): TemplateDayInput[] {
  const result = copy(days);
  const day = result[dayIndex];
  if (day && day.stops.length < 20 && !result.some((d) => d.stops.some((s) => s.key === key))) day.stops.push({ key, placeId, kind: 'visit', note: '' });
  return result;
}
/** toIndex is the insertion boundary in the destination before removing the original stop. */
export function moveStop(days: readonly TemplateDayInput[], key: string, toDay: number, toIndex: number): TemplateDayInput[] {
  const result = copy(days);
  const sourceIndex = result.findIndex((day) => day.stops.some((stop) => stop.key === key));
  const source = result[sourceIndex];
  const target = result[toDay];
  if (!source || !target || toIndex < 0 || toIndex > target.stops.length || (sourceIndex !== toDay && target.stops.length >= 20)) return result;
  const index = source.stops.findIndex((stop) => stop.key === key);
  const [stop] = source.stops.splice(index, 1);
  if (stop) target.stops.splice(sourceIndex === toDay && index < toIndex ? toIndex - 1 : toIndex, 0, stop);
  return result;
}
export function removeStop(days: readonly TemplateDayInput[], key: string): TemplateDayInput[] { return copy(days).map((day) => ({ ...day, stops: day.stops.filter((stop) => stop.key !== key) })); }
export function replaceStop(days: readonly TemplateDayInput[], key: string, placeId: string): TemplateDayInput[] {
  return copy(days).map((day) => ({ ...day, stops: day.stops.map((stop) => stop.key === key ? { ...stop, placeId } : stop) }));
}
export function addDay(days: readonly TemplateDayInput[]): TemplateDayInput[] { return days.length < 5 ? [...copy(days), { startTime: '07:00', stops: [] }] : copy(days); }
export function removeDay(days: readonly TemplateDayInput[], index: number): TemplateDayInput[] { return days.length > 1 ? copy(days).filter((_, i) => i !== index) : copy(days); }
