import { randomUUID } from 'node:crypto';
import type { GeoPoint } from '@ranhduong/contracts';
import type { CookieOptions } from 'express';
import type { Env } from '../../../config/env';
import { readCookie } from '../../../shared/http/cookies';
import { clearSessionCookieOptions } from '../../../shared/session/session-cookie';

export function readGuestId(header: string | undefined): string | undefined {
  const id = readCookie(header, 'gid');
  return id && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id) ? id.toLowerCase() : undefined;
}

export function guestIdentity(header: string | undefined, env: Env): { id: string; cookie?: CookieOptions } {
  const id = readGuestId(header);
  return id ? { id } : { id: randomUUID(), cookie: { ...clearSessionCookieOptions(env), maxAge: 365 * 86400 * 1000 } };
}

/** Round before planning as well as persistence: precise accommodation never leaves this boundary. */
export function roundStayLocation(point: GeoPoint | undefined): GeoPoint | undefined {
  return point ? { type: 'Point', coordinates: point.coordinates.map((axis) => Math.round(axis * 200) / 200) as [number, number] } : undefined;
}
