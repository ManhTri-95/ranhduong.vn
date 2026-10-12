import { HexColor, type CityNow } from '@ranhduong/contracts';
export function cityThemeAccent(cityAccent: string | undefined, current: CityNow | null | undefined, now: number, failed = false): string | undefined {
  const fresh = current && !failed && (!now || Date.parse(current.expiresAt) > now);
  if (fresh && HexColor.safeParse(current.accent).success) return current.accent;
  return HexColor.safeParse(cityAccent).success ? cityAccent : undefined;
}
