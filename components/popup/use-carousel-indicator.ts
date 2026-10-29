import { type RefObject, useLayoutEffect } from 'react';

/** Keep the highlight at the carousel's actual position, including overscroll. */
export function useCarouselIndicator(
  carouselRef: RefObject<HTMLElement | null>,
  indicatorRef: RefObject<HTMLElement | null>
) {
  useLayoutEffect(() => {
    const carousel = carouselRef.current;
    const indicator = indicatorRef.current;
    if (!carousel || !indicator) return;
    const update = () => {
      if (!carousel.clientWidth) return;
      const progress = carousel.scrollLeft / carousel.clientWidth;
      indicator.style.transform = `translateX(${progress * 100}%)`;
    };
    const scroll = (event: Event) => {
      if (event.target === carousel) update();
    };
    carousel.addEventListener('scroll', scroll, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(carousel);
    update();
    return () => {
      carousel.removeEventListener('scroll', scroll);
      observer?.disconnect();
    };
  }, [carouselRef, indicatorRef]);
}
