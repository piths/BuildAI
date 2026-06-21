'use client';

import { RefObject, useEffect } from 'react';

/**
 * Eased (inertial) wheel scrolling for a scroll container.
 *
 * Mouse wheels scroll in fixed line/notch steps, which feels like the page jumps
 * "in sections". This interpolates the container's scrollTop toward a target each
 * animation frame so wheel scrolling feels continuous. Trackpads and touch already
 * have smooth OS momentum, so those are left to scroll natively.
 */
export function useSmoothScroll(ref: RefObject<HTMLElement | null>, enabled = true, ease = 0.15) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let target = el.scrollTop;
    let raf = 0;
    let animating = false;

    const clamp = (v: number) => Math.max(0, Math.min(v, el.scrollHeight - el.clientHeight));

    const step = () => {
      const cur = el.scrollTop;
      const diff = target - cur;
      if (Math.abs(diff) < 0.5) {
        el.scrollTop = target;
        animating = false;
        return;
      }
      el.scrollTop = cur + diff * ease;
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      // Ignore pinch-zoom and modifier scrolls.
      if (e.ctrlKey || e.metaKey) return;
      // Detect a mouse wheel: line mode, or a large single pixel step. Trackpads
      // emit many small pixel deltas — let those scroll natively (smooth already).
      const isMouseWheel = e.deltaMode === 1 || Math.abs(e.deltaY) >= 100;
      if (!isMouseWheel) {
        if (!animating) target = el.scrollTop;
        return;
      }
      e.preventDefault();
      if (!animating) target = el.scrollTop;
      const lineFactor = e.deltaMode === 1 ? 16 : 1;
      target = clamp(target + e.deltaY * lineFactor);
      if (!animating) {
        animating = true;
        raf = requestAnimationFrame(step);
      }
    };

    // Keep target in sync if the user scrolls some other way (scrollbar, keys).
    const onScroll = () => {
      if (!animating) target = el.scrollTop;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, enabled, ease]);
}
