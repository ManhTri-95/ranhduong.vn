import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeSeasonMotion, observeTimelineMotion } from './scroll-motion';

// Browser boundaries only; state changes and scheduling exercise the real helper.
class MotionElement extends EventTarget {
  dataset: Record<string, string> = {};
  marker: MotionElement | null = null;
  constructor(public top = 900, public stops: MotionElement[] = []) { super(); }
  getBoundingClientRect() { return { top: this.top, bottom: this.top + 44 }; }
  querySelector() { return this.marker; }
  querySelectorAll() { return this.stops; }
  closest() { return this; }
  contains(target: MotionElement) { return this === target || this.stops.includes(target); }
}
class MotionObserver {
  static instances: MotionObserver[] = [];
  targets = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) { MotionObserver.instances.push(this); }
  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
  enter(target: MotionElement, visible = true) {
    if (this.targets.has(target as unknown as Element)) {
      this.callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0.0 } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
  }
  enterTogether(targets: MotionElement[]) {
    this.callback(targets.map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 }) as unknown as IntersectionObserverEntry), this as unknown as IntersectionObserver);
  }
}
const element = (value: MotionElement) => value as unknown as HTMLElement;
let browser: EventTarget & { innerHeight: number; matchMedia: () => typeof media };
let doc: EventTarget & { hidden: boolean };
let media: EventTarget & { matches: boolean };
let cleanups: (() => void)[];

beforeEach(() => {
  vi.useFakeTimers();
  media = Object.assign(new EventTarget(), { matches: false });
  browser = Object.assign(new EventTarget(), { innerHeight: 800, matchMedia: () => media });
  doc = Object.assign(new EventTarget(), { hidden: false });
  MotionObserver.instances = [];
  cleanups = [];
  vi.stubGlobal('window', browser);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('IntersectionObserver', MotionObserver);
});
afterEach(() => { cleanups.forEach((cleanup) => cleanup()); vi.useRealTimers(); vi.unstubAllGlobals(); });
function timeline(...tops: number[]) {
  const stops = tops.map((top) => { const stop = new MotionElement(top); stop.marker = new MotionElement(top); return stop; });
  const root = new MotionElement(0, stops);
  const cleanup = observeTimelineMotion(element(root));
  cleanups.push(cleanup);
  return { stops, root, cleanup, observer: MotionObserver.instances.at(-1)! };
}
function reduce() { media.matches = true; media.dispatchEvent(new Event('change')); }
function scroll() { browser.dispatchEvent(new Event('scroll')); }

describe('S25 itinerary scroll motion', () => {
  it('leaves initially visible stops static and defers only offscreen decoration', () => {
    const { stops } = timeline(100, 900);
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'waiting']);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not animate an initial observer callback before any scroll', () => {
    const { stops, observer } = timeline(900);
    observer.enter(stops[0]!.marker!);
    expect(stops[0]!.dataset.rdMotionState).toBe('done');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reveals the marker for 400ms before drawing the connector for 600ms', () => {
    const { stops, observer } = timeline(900);
    scroll(); observer.enter(stops[0]!.marker!);
    expect(stops[0]!.dataset.rdMotionState).toBe('marker');
    vi.advanceTimersByTime(399); expect(stops[0]!.dataset.rdMotionState).toBe('marker');
    vi.advanceTimersByTime(1); expect(stops[0]!.dataset.rdMotionState).toBe('line');
    vi.advanceTimersByTime(599); expect(stops[0]!.dataset.rdMotionState).toBe('line');
    vi.advanceTimersByTime(1); expect(stops[0]!.dataset.rdMotionState).toBe('done');
    observer.enter(stops[0]!.marker!, false); observer.enter(stops[0]!.marker!);
    expect(stops[0]!.dataset.rdMotionState).toBe('done');
  });
  it('serializes several entering stops so a map pin still has a motion slot', () => {
    const { stops, observer } = timeline(900, 1000, 1100);
    scroll(); observer.enterTogether(stops.map((stop) => stop.marker!));
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['marker', 'waiting', 'waiting']);
    vi.advanceTimersByTime(500);
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['line', 'waiting', 'waiting']);
    vi.advanceTimersByTime(500);
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'marker', 'waiting']);
    vi.advanceTimersByTime(1000);
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'done', 'marker']);
  });
  it('finishes an active stop and skips queued stops when they leave the viewport', () => {
    const { stops, observer } = timeline(900, 1000);
    scroll(); observer.enterTogether(stops.map((stop) => stop.marker!));
    observer.enter(stops[1]!.marker!, false);
    observer.enter(stops[0]!.marker!, false);
    vi.advanceTimersByTime(3000);
    expect(stops[0]!.dataset.rdMotionState).toBe('done');
    expect(stops[1]!.dataset.rdMotionState).toBe('waiting');
    observer.enter(stops[1]!.marker!);
    expect(stops[1]!.dataset.rdMotionState).toBe('marker');
  });
  it('keeps every stop final when reduced motion is already enabled', () => {
    media.matches = true;
    const { stops } = timeline(900, 1000);
    expect(stops.every((stop) => stop.dataset.rdMotionState !== 'waiting')).toBe(true);
    scroll(); vi.advanceTimersByTime(3000);
    expect(stops.every((stop) => !['marker', 'line'].includes(stop.dataset.rdMotionState ?? ''))).toBe(true);
  });
  it('cancels active and queued work immediately when reduced motion is enabled', () => {
    const { stops, observer } = timeline(900, 1000);
    scroll(); observer.enterTogether(stops.map((stop) => stop.marker!));
    reduce();
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'done']);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'done']);
  });
  it('finishes all decoration on dispose and ignores subsequent observer delivery', () => {
    const { stops, observer, cleanup } = timeline(900, 1000);
    scroll(); observer.enterTogether(stops.map((stop) => stop.marker!));
    cleanup(); observer.enterTogether(stops.map((stop) => stop.marker!));
    expect(stops.map((stop) => stop.dataset.rdMotionState)).toEqual(['done', 'done']);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('shows a focused stop immediately even when its reveal is queued', () => {
    const { stops, root, observer } = timeline(900, 1000);
    scroll(); observer.enterTogether(stops.map((stop) => stop.marker!));
    const event = new Event('focusin'); Object.defineProperty(event, 'target', { value: stops[1] });
    root.dispatchEvent(event);
    expect(stops[1]!.dataset.rdMotionState).toBe('done');
    vi.advanceTimersByTime(3000);
    expect(stops[1]!.dataset.rdMotionState).toBe('done');
  });
  it('keeps decoration visible if IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { stops } = timeline(900);
    expect(stops[0]!.dataset.rdMotionState).not.toBe('waiting');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('S25 seasonal sway lifecycle', () => {
  it('waits for scrolling and pauses outside the viewport or in a hidden tab', () => {
    const banner = new MotionElement(100);
    cleanups.push(observeSeasonMotion(element(banner)));
    const observer = MotionObserver.instances.at(-1)!;
    observer.enter(banner);
    expect(banner.dataset.rdMotionState).not.toBe('running');
    scroll(); expect(banner.dataset.rdMotionState).toBe('running');
    observer.enter(banner, false); expect(banner.dataset.rdMotionState).toBe('paused');
    observer.enter(banner); expect(banner.dataset.rdMotionState).toBe('running');
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    expect(banner.dataset.rdMotionState).toBe('paused');
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
    expect(banner.dataset.rdMotionState).toBe('running');
    reduce(); expect(banner.dataset.rdMotionState).toBe('done');
  });
  it('stays static when APIs are missing and stops permanently on cleanup', () => {
    const banner = new MotionElement(100);
    const cleanup = observeSeasonMotion(element(banner)); cleanups.push(cleanup);
    MotionObserver.instances.at(-1)!.enter(banner); scroll(); cleanup(); scroll();
    expect(banner.dataset.rdMotionState).toBe('done');
    vi.stubGlobal('IntersectionObserver', undefined);
    const fallback = new MotionElement(100);
    cleanups.push(observeSeasonMotion(element(fallback)));
    scroll(); expect(fallback.dataset.rdMotionState).not.toBe('running');
  });
});
