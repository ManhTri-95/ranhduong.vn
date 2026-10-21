import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../../../testing/env';
import { guestIdentity, roundStayLocation } from './guest-identity';

describe('S37 guest identity and accommodation', () => {
  it('retains only UUID v4 cookies and does not renew an existing identity', () => {
    const id = randomUUID();
    expect(guestIdentity(`other=1; gid=${id}`, testEnv())).toEqual({ id });
    for (const header of [undefined, 'gid=forged', 'gid=00000000-0000-1000-8000-000000000000']) {
      const identity = guestIdentity(header, testEnv());
      expect(identity.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
      expect(identity.cookie).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 365 * 86400 * 1000 });
    }
  });

  it('uses the session domain and secure flag on HTTPS', () => {
    expect(guestIdentity(undefined, testEnv({ API_PUBLIC_URL: 'https://api.gia-lap.example', SESSION_COOKIE_DOMAIN: '.gia-lap.example' })).cookie)
      .toMatchObject({ secure: true, domain: '.gia-lap.example' });
  });

  it('rounds both axes to 0.005 degrees without mutating the input', () => {
    const point = { type: 'Point' as const, coordinates: [108.441234, -11.942345] as [number, number] };
    expect(roundStayLocation(point)).toEqual({ type: 'Point', coordinates: [108.44, -11.94] });
    expect(point.coordinates).toEqual([108.441234, -11.942345]);
    expect(roundStayLocation(undefined)).toBeUndefined();
  });
});
