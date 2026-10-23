import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeLivingRoute, routeProgress } from './living-route';

class Scene extends EventTarget {
  dataset: Record<string, string> = {};
  values = new Map<string, string>();
  style = { setProperty: (name: string, value: string) => { this.values.set(name, value); } };
  constructor(public top = 900, public height = 800, public scenes: Scene[] = []) { super(); }
  querySelectorAll() { return this.scenes; }
  getBoundingClientRect() { return { top: this.top, height: this.height }; }
  closest() { return this; }
  contains(target: Scene) { return this === target || this.scenes.includes(target); }
}
class Observer {
  static instances: Observer[] = [];
  targets = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) { Observer.instances.push(this); }
  observe(target: Element) { this.targets.add(target); }
  disconnect() { this.targets.clear(); }
  enter(scene: Scene, visible = true) {
    if (this.targets.has(scene as unknown as Element)) this.callback([{ target: scene, isIntersecting: visible } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}
let browser: EventTarget & { innerHeight: number; matchMedia: () => typeof preference };
let doc: EventTarget & { hidden: boolean };
let preference: EventTarget & { matches: boolean };
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let dispose: () => void;
beforeEach(() => {
  frames = new Map(); nextFrame = 0; dispose = () => {};
  preference = Object.assign(new EventTarget(), { matches: false });
  browser = Object.assign(new EventTarget(), { innerHeight: 800, matchMedia: () => preference });
  doc = Object.assign(new EventTarget(), { hidden: false });
  Observer.instances = [];
  vi.stubGlobal('window', browser); vi.stubGlobal('document', doc); vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});
afterEach(() => { dispose(); vi.unstubAllGlobals(); });
function mount() {
  const scene = new Scene(20);
  const root = new Scene(-20, 4000, [scene]);
  dispose = observeLivingRoute(root as unknown as HTMLElement);
  return { scene, root, observer: Observer.instances[0] };
}
function flush() { const work = [...frames.values()]; frames.clear(); work.forEach(callback => callback(0)); }

describe('Living Route progress', () => {
  it('draws from the lower viewport to a completed scene, with bounded progress', () => {
    expect(routeProgress(680, 800, 800)).toBe(0);
    expect(routeProgress(20, 800, 800)).toBe(0.5);
    expect(routeProgress(-640, 800, 800)).toBe(1);
    expect(routeProgress(2000, 800, 800)).toBe(0);
    expect(routeProgress(-2000, 800, 800)).toBe(1);
  });
  it('uses the static final state for invalid dimensions', () => {
    expect(routeProgress(NaN, 500, 800)).toBe(1);
    expect(routeProgress(0, 0, 800)).toBe(1);
    expect(routeProgress(0, 500, 0)).toBe(1);
  });
});
describe('Living Route enhancement lifecycle', () => {
  it('does no work on the initial observer delivery and coalesces scroll events into one frame', () => {
    const { scene, observer } = mount();
    expect(observer).toBeDefined();
    observer!.enter(scene);
    expect(frames.size).toBe(0);
    browser.dispatchEvent(new Event('scroll')); browser.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    flush();
    expect(scene.values.get('--rd-route-progress')).toBe('0.500');
    expect(frames.size).toBe(0);
  });
  it('updates visible scenes only and pauses pending work in a hidden tab', () => {
    const { scene, observer } = mount(); observer!.enter(scene);
    browser.dispatchEvent(new Event('scroll'));
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange')); flush();
    observer!.enter(scene, false); scene.top = -400;
    browser.dispatchEvent(new Event('scroll')); flush();
    expect(scene.values.get('--rd-route-progress')).toBe('0.500');
  });
  it('finalizes and cancels immediately for live reduced motion and on disposal', () => {
    const { scene, root, observer } = mount(); observer!.enter(scene);
    browser.dispatchEvent(new Event('scroll'));
    preference.matches = true; preference.dispatchEvent(new Event('change'));
    expect(frames.size).toBe(0);
    expect(scene.values.get('--rd-route-progress')).toBe('1');
    expect(root.dataset.rdRouteMotion).toBe('static');
    browser.dispatchEvent(new Event('scroll')); expect(frames.size).toBe(0);
  });
  it('leaves no observer or frames for reduced motion and missing browser APIs', () => {
    preference.matches = true; mount(); expect(Observer.instances).toHaveLength(0);
    preference.matches = false; vi.stubGlobal('IntersectionObserver', undefined);
    mount(); expect(Observer.instances).toHaveLength(0);
  });
  it('keeps a keyboard-focused scene in its final position', () => {
    const { scene, root, observer } = mount(); observer!.enter(scene);
    const event = new Event('focusin'); Object.defineProperty(event, 'target', { value: scene }); root.dispatchEvent(event);
    browser.dispatchEvent(new Event('scroll')); flush();
    expect(scene.values.get('--rd-route-progress')).toBe('1');
    dispose(); browser.dispatchEvent(new Event('scroll')); expect(frames.size).toBe(0);
  });
});
