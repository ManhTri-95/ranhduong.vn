import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from 'maplibre-gl';
import { resolveMapStyleSprites } from './map-style';

describe('map sprite URLs across deployment origins', () => {
  it('loads the local namespace from the current origin for both maps', () => {
    const style: StyleSpecification = { version: 8, sources: {}, layers: [], sprite: [{ id: 'rd-pins', url: '/maps/notebook/sprite' }] };
    const result = resolveMapStyleSprites(style, '/maps/notebook/style.json', 'http://localhost:3100/da-lat/ban-do');
    expect(result.sprite).toEqual([{ id: 'rd-pins', url: 'http://localhost:3100/maps/notebook/sprite' }]);
    expect(style.sprite).toEqual([{ id: 'rd-pins', url: '/maps/notebook/sprite' }]);
  });

  it('resolves legacy string sprites relative to an overridden remote style', () => {
    const style: StyleSpecification = { version: 8, sources: {}, layers: [], sprite: '../icons/sprite' };
    expect(resolveMapStyleSprites(style, 'https://tiles.example.com/styles/custom/style.json', 'https://staging.example.com/da-lat/ban-do').sprite)
      .toBe('https://tiles.example.com/styles/icons/sprite');
  });

  it('preserves absolute remote sprites in a multi-sprite style', () => {
    const style: StyleSpecification = { version: 8, sources: {}, layers: [], sprite: [{ id: 'default', url: 'https://tiles.example.com/sprite' }, { id: 'rd-pins', url: './sprite' }] };
    expect(resolveMapStyleSprites(style, '/maps/notebook/style.json', 'https://staging.example.com/da-lat/ban-do').sprite).toEqual([
      { id: 'default', url: 'https://tiles.example.com/sprite' }, { id: 'rd-pins', url: 'https://staging.example.com/maps/notebook/sprite' },
    ]);
  });

  it('leaves styles without sprites usable for runtime namespace installation', () => {
    const style: StyleSpecification = { version: 8, sources: {}, layers: [] };
    expect(resolveMapStyleSprites(style, '/style.json', 'http://localhost:3100/da-lat/ban-do')).toBe(style);
  });
});
