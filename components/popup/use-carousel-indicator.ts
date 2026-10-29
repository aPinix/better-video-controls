import { type RefObject, useLayoutEffect } from 'react';

/** Follow the native gesture without rerendering or easing behind the pointer. */
export function useCarouselIndicator(
  carouselRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>
) {
  useLayoutEffect(() => {
    const carousel = carouselRef.current;
    const indicator = indicatorRef.current;
    if (!carousel || !indicator) return;
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    let bounce: Animation | null = null;
    let previous = carousel.scrollLeft;
    let direction = 0;
    let nativeBounce = false;
    const update = () => {
      if (!carousel.clientWidth) return;
      bounce?.cancel();
      bounce = null;
      const raw = carousel.scrollLeft / carousel.clientWidth;
      nativeBounce ||= raw < 0 || raw > 1;
      const progress = reducedMotion ? Math.max(0, Math.min(1, raw)) : raw;
      const delta = carousel.scrollLeft - previous;
      if (Math.abs(delta) > 0.01) direction = Math.sign(delta);
      previous = carousel.scrollLeft;
      indicator.style.transform = `translateX(${progress * 100}%)`;
    };
    const scroll = (event: Event) => {
      if (event.target === carousel) update();
    };
    const settle = (event: Event) => {
      if (event.target !== carousel) return;
      const alreadyBounced = nativeBounce;
      nativeBounce = false;
      const settledDirection = direction;
      direction = 0;
      if (
        reducedMotion ||
        alreadyBounced ||
        !settledDirection ||
        !indicator.animate
      )
        return;
      const base = indicator.style.transform;
      const progress =
        (carousel.scrollLeft / (carousel.clientWidth || 1)) * 100;
      // A damped spring (mass 1, stiffness 100, damping 10) preserves a small
      // amount of the gesture's momentum without lagging behind the drag.
      const frames = Array.from({ length: 33 }, (_, index) => {
        const time = (index / 32) * 0.7;
        const displacement =
          index === 32
            ? 0
            : ((settledDirection * 80) / Math.sqrt(75)) *
              Math.exp(-5 * time) *
              Math.sin(Math.sqrt(75) * time);
        return {
          transform:
            index === 0 || index === 32
              ? base
              : `translateX(calc(${progress}% + ${displacement}px))`,
        };
      });
      bounce?.cancel();
      bounce = indicator.animate(frames, { duration: 420, easing: 'linear' });
    };
    carousel.addEventListener('scroll', scroll, { passive: true });
    carousel.addEventListener('scrollend', settle);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(carousel);
    update();
    return () => {
      carousel.removeEventListener('scroll', scroll);
      carousel.removeEventListener('scrollend', settle);
      bounce?.cancel();
      observer?.disconnect();
    };
  }, [carouselRef, indicatorRef]);
}
