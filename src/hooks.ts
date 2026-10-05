import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const RM_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(RM_QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(RM_QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Staged timeline: returns how many of `times` (ms from mount) have passed.
 * With `skip` (reduced motion, settled screen) it starts at the final stage.
 */
export function useStages(times: readonly number[], skip = false): number {
  const [stage, setStage] = useState(skip ? times.length : 0);
  useEffect(() => {
    if (skip) {
      setStage(times.length);
      return;
    }
    const ids = times.map((t, i) => window.setTimeout(() => setStage((s) => Math.max(s, i + 1)), t));
    return () => ids.forEach(clearTimeout);
    // `times` is a module-level constant at every call site.
  }, [skip]);
  return stage;
}

/** Marks the document while the tab is hidden so CSS can pause infinite loops. */
export function usePageVisibility(): void {
  useEffect(() => {
    const sync = () => {
      if (document.hidden) document.documentElement.setAttribute('data-hidden', '');
      else document.documentElement.removeAttribute('data-hidden');
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
}

/** Scale factor that fits a fixed-width element into its container (never above 1). */
export function useFitScale<T extends HTMLElement>(designWidth: number) {
  const ref = useRef<T>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, el.clientWidth / designWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);
  return [ref, scale] as const;
}

/** Runs `fn` after `ms`, cleared on unmount or when deps change. */
export function useTimeout(fn: () => void, ms: number | null, deps: unknown[] = []): void {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const id = window.setTimeout(() => saved.current(), ms);
    return () => clearTimeout(id);
  }, [ms, ...deps]);
}
