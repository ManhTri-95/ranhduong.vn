/** Decorative progress only: begin at 85% viewport height, finish with 20% still visible. */
export function routeProgress(top: number, height: number, viewport: number): number {
  if (![top, height, viewport].every(Number.isFinite) || height <= 0 || viewport <= 0) return 1;
  return Math.min(1, Math.max(0, (viewport * 0.85 - top) / (height + viewport * 0.65)));
}

/** One event-driven frame for visible scenes. SSR, focus and reduced motion always have a final state. */
export function observeLivingRoute(root: HTMLElement): () => void {
  const scenes = [...root.querySelectorAll<HTMLElement>('[data-rd-route-scene]')];
  const finalize = () => {
    root.dataset.rdRouteMotion = 'static';
    [root, ...scenes].forEach(scene => scene.style.setProperty('--rd-route-progress', '1'));
  };
  finalize();
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    || typeof IntersectionObserver !== 'function' || typeof requestAnimationFrame !== 'function') return () => {};
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return () => {};
  const visible = new Set<HTMLElement>();
  const focused = new Set<HTMLElement>();
  let frame: number | undefined;
  let scrolled = false;
  let disposed = false;
  const cancel = () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; };
  const update = () => {
    frame = undefined;
    if (disposed || document.hidden || !scrolled) return;
    // Read geometry first, then write CSS; nothing runs continuously between scroll events.
    const readings = [root, ...visible].map(scene => ({ scene, bounds: scene.getBoundingClientRect() }));
    root.dataset.rdRouteMotion = 'live';
    for (const { scene, bounds } of readings) {
      scene.style.setProperty('--rd-route-progress', focused.has(scene) ? '1' : routeProgress(bounds.top, bounds.height, window.innerHeight).toFixed(3));
    }
  };
  const schedule = () => {
    if (!disposed && scrolled && !document.hidden && visible.size && frame === undefined) frame = requestAnimationFrame(update);
  };
  const observer = new IntersectionObserver(entries => {
    if (disposed) return;
    for (const entry of entries) {
      const scene = entry.target as HTMLElement;
      if (entry.isIntersecting) visible.add(scene);
      else visible.delete(scene);
    }
    schedule();
  }, { rootMargin: '80px 0px' });
  scenes.forEach(scene => observer.observe(scene));
  const onScroll = () => { scrolled = true; schedule(); };
  const onVisibility = () => { if (document.hidden) cancel(); else schedule(); };
  const onFocus = (event: Event) => {
    const scene = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-rd-route-scene]');
    if (!scene || !root.contains(scene)) return;
    focused.add(scene);
    scene.style.setProperty('--rd-route-progress', '1');
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancel(); observer.disconnect(); visible.clear(); focused.clear(); finalize();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('visibilitychange', onVisibility);
    root.removeEventListener('focusin', onFocus);
    preference.removeEventListener('change', onPreference);
  };
  const onPreference = () => { if (preference.matches) dispose(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  root.addEventListener('focusin', onFocus);
  preference.addEventListener('change', onPreference);
  return dispose;
}
