import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildOverpassQuery, fetchOverpass } from './overpass';

describe('Overpass client', () => {
  let server: Server;
  let endpoint: string;
  let status = 200;
  let body = '{}';
  let requestBody = '';
  let method: string | undefined;
  beforeAll(async () => {
    server = createServer(async (req, res) => {
      method = req.method;
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      requestBody = Buffer.concat(chunks).toString();
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/interpreter`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())); });

  it('queries all OSM types with south/west/north/east bounds and center output', () => {
    const query = buildOverpassQuery([108.34, 11.81, 108.62, 12.09]);
    expect(query).toContain('(11.81,108.34,12.09,108.62)');
    expect(query).toContain('nwr["amenity"~"^(cafe|restaurant|fast_food|food_court)$"]');
    expect(query).toContain('nwr["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|theme_park)$"]');
    expect(query).toContain('out center;');
    expect(() => buildOverpassQuery([1, 1, 0, 0])).toThrow();
  });

  it('POSTs encoded QL and accepts an empty successful result', async () => {
    status = 200; body = JSON.stringify({ elements: [], version: 0.6 });
    expect(await fetchOverpass([0, 0, 1, 1], endpoint)).toEqual({ elements: [] });
    expect(method).toBe('POST');
    expect(new URLSearchParams(requestBody).get('data')).toContain('(0,0,1,1)');
  });

  it.each([429, 503])('reports HTTP %s without treating it as empty data', async (code) => {
    status = code; body = '<html>Overpass busy</html>';
    await expect(fetchOverpass([0, 0, 1, 1], endpoint)).rejects.toThrow(new RegExp(`HTTP ${code}`));
  });

  it('rejects partial JSON results', async () => {
    status = 200; body = JSON.stringify({ elements: [], remark: 'runtime error: timeout' });
    await expect(fetchOverpass([0, 0, 1, 1], endpoint)).rejects.toThrow(/Overpass/);
  });

  it('rejects HTML instead of JSON', async () => {
    status = 200; body = '<html>proxy error</html>';
    await expect(fetchOverpass([0, 0, 1, 1], endpoint)).rejects.toThrow(/JSON/);
  });
});
