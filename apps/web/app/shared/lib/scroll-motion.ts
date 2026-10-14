const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Enhance decoration only; SSR and unsupported browsers keep the final state. */
export function observeTimelineMotion(root: HTMLElement): () => void {
  const stops = [...root.querySelectorAll<HTMLElement>('[data-rd-motion-stop]')];
  stops.forEach((stop) => { stop.dataset.rdMotionState = 'done'; });
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || typeof IntersectionObserver !== 'function') return () => {};
  const preference = window.matchMedia(REDUCED_MOTION);
  if (preference.matches) return () => {};

  const targets = new Map<Element, HTMLElement>();
  const visible = new Set<HTMLElement>();
  let queue: { stop: HTMLElement; readyAt: number }[] = [];
  let active: HTMLElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let scrolled = false;
  let disposed = false;

  const finish = (stop: HTMLElement) => {
    stop.dataset.rdMotionState = 'done';
    const target = stop.querySelector('.rd-itinerary-stop__number');
    if (target) observer.unobserve(target);
  };
  const pump = () => {
    if (disposed || active || document.hidden) return;
    clearTimeout(timer);
    queue = queue.filter(({ stop }) => visible.has(stop) && stop.dataset.rdMotionState === 'waiting');
    const next = queue[0];
    if (!next) return;
    const delay = next.readyAt - Date.now();
    if (delay > 0) { timer = setTimeout(pump, delay); return; }
    queue.shift();
    active = next.stop;
    active.dataset.rdMotionState = 'marker';
    // One timeline effect at a time leaves a second slot for a selected map pin.
    timer = setTimeout(() => {
      next.stop.dataset.rdMotionState = 'line';
      timer = setTimeout(() => { finish(next.stop); active = undefined; pump(); }, 600);
    }, 400);
  };
  const observer = new IntersectionObserver((entries) => {
    if (disposed) return;
    let stagger = 0;
    for (const entry of entries) {
      const stop = targets.get(entry.target);
      if (!stop || stop.dataset.rdMotionState === 'done') continue;
      if (!entry.isIntersecting) {
        visible.delete(stop);
        if (active === stop) { clearTimeout(timer); finish(stop); active = undefined; }
      } else if (!scrolled) {
        // observe() also delivers an initial callback; it is not a scroll reveal.
        finish(stop);
      } else {
        visible.add(stop);
        if (stop.dataset.rdMotionState === 'waiting' && !queue.some((job) => job.stop === stop)) {
          queue.push({ stop, readyAt: Date.now() + stagger * 500 });
          stagger++;
        }
      }
    }
    pump();
  }, { threshold: 0 });

  for (const stop of stops) {
    const target = stop.querySelector<HTMLElement>('.rd-itinerary-stop__number');
    if (!target) continue;
    const bounds = target.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) continue;
    stop.dataset.rdMotionState = 'waiting';
    targets.set(target, stop);
    observer.observe(target);
  }
  const onScroll = () => { scrolled = true; };
  const onFocus = (event: Event) => {
    const stop = (event.target as Element | null)?.closest<HTMLElement>('[data-rd-motion-stop]');
    if (!stop || !root.contains(stop)) return;
    if (active === stop) { clearTimeout(timer); active = undefined; }
    finish(stop);
    pump();
  };
  const onVisibility = () => {
    if (document.hidden && active) { clearTimeout(timer); finish(active); active = undefined; }
    pump();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    observer.disconnect();
    queue = [];
    active = undefined;
    stops.forEach((stop) => { stop.dataset.rdMotionState = 'done'; });
    window.removeEventListener('scroll', onScroll);
    root.removeEventListener('focusin', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    preference.removeEventListener('change', onPreference);
  };
  const onPreference = () => { if (preference.matches) dispose(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  root.addEventListener('focusin', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  preference.addEventListener('change', onPreference);
  return dispose;
}

/** Start only after scrolling; pause the loop when it cannot be seen. */
export function observeSeasonMotion(root: HTMLElement): () => void {
  root.dataset.rdMotionState = 'done';
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || typeof IntersectionObserver !== 'function') return () => {};
  const preference = window.matchMedia(REDUCED_MOTION);
  let visible = false;
  let scrolled = false;
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    root.dataset.rdMotionState = preference.matches || !scrolled ? 'done' : visible && !document.hidden ? 'running' : 'paused';
  };
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry || disposed) return;
    visible = entry.isIntersecting;
    sync();
  });
  const onScroll = () => { scrolled = true; sync(); };
  observer.observe(root);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', sync);
  preference.addEventListener('change', sync);
  return () => {
    disposed = true;
    observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', sync);
    preference.removeEventListener('change', sync);
    root.dataset.rdMotionState = 'done';
  };
}
