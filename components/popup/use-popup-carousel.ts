import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

type Navigation = { page: number; pointer: boolean };

/** Let native horizontal scrolling follow the gesture, then snap to a page. */
export function usePopupCarousel(
  ref: RefObject<HTMLDivElement | null>,
  page: number,
  onPageChange: (page: number) => void,
  onSettled?: (page: number) => void
) {
  const pending = useRef<Navigation | null>(null);
  const [request, setRequest] = useState<Navigation | null>(null);
  const initial = useRef(true);
  const lastSettled = useRef<number | null>(null);
  const latest = useRef({ page, onPageChange, onSettled });
  latest.current = { page, onPageChange, onSettled };
  const requestNavigation = useCallback((index: number, pointer: boolean) => {
    const next = { page: index, pointer };
    lastSettled.current = null;
    pending.current = next;
    setRequest(next);
    latest.current.onPageChange(index);
  }, []);
  const settle = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const width = element.clientWidth;
    const index = width
      ? Math.round(element.scrollLeft / width)
      : (pending.current?.page ?? latest.current.page);
    if (width && Math.abs(element.scrollLeft - index * width) >= 1) {
      if (!pending.current) {
        element.dataset.navigation =
          index * width > element.scrollLeft ? 'forward' : 'back';
        element.scrollTo?.({
          left: index * width,
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
        });
      }
      return;
    }
    if (
      pending.current &&
      Math.abs(element.scrollLeft - pending.current.page * width) >= 1
    )
      return;
    delete element.dataset.navigation;
    if (!pending.current && lastSettled.current === index) return;
    lastSettled.current = index;
    pending.current = null;
    setRequest(null);
    latest.current.onPageChange(index);
    latest.current.onSettled?.(index);
  }, [ref]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout>;
    let touch: { x: number; y: number } | null = null;
    const scroll = (event: Event) => {
      if (event.target !== element) return;
      if (!pending.current)
        latest.current.onPageChange(
          Math.round(element.scrollLeft / (element.clientWidth || 1))
        );
      clearTimeout(timer);
      timer = setTimeout(settle, 140);
    };
    const scrollEnd = (event: Event) => {
      if (event.target === element) {
        clearTimeout(timer);
        settle();
      }
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      const delta =
        event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
      if (
        !delta ||
        (!event.shiftKey && Math.abs(delta) <= Math.abs(event.deltaY) * 1.25)
      )
        return;
      // A genuine scroll gesture owns the position from here. Do not consume
      // its deltas or turn them into navigation: the browser moves the pages.
      pending.current = null;
      setRequest(null);
      delete element.dataset.navigation;
    };
    const touchStart = (event: TouchEvent) => {
      const point = event.touches[0];
      touch = point ? { x: point.clientX, y: point.clientY } : null;
    };
    const touchMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (
        pending.current &&
        touch &&
        point &&
        Math.abs(point.clientX - touch.x) >
          Math.max(5, Math.abs(point.clientY - touch.y))
      ) {
        pending.current = null;
        setRequest(null);
        delete element.dataset.navigation;
      }
    };
    element.addEventListener('scroll', scroll, { passive: true });
    element.addEventListener('scrollend', scrollEnd);
    element.addEventListener('wheel', wheel, { passive: true });
    element.addEventListener('touchstart', touchStart, { passive: true });
    element.addEventListener('touchmove', touchMove, { passive: true });
    return () => {
      clearTimeout(timer);
      element.removeEventListener('scroll', scroll);
      element.removeEventListener('scrollend', scrollEnd);
      element.removeEventListener('wheel', wheel);
      element.removeEventListener('touchstart', touchStart);
      element.removeEventListener('touchmove', touchMove);
    };
  }, [ref, settle]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || (!pending.current && !initial.current)) return;
    initial.current = false;
    const target = page * element.clientWidth;
    const animate =
      request?.pointer &&
      !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (
      Math.abs(element.scrollLeft - target) < 1 ||
      !element.clientWidth ||
      !element.scrollTo
    ) {
      settle();
      return;
    }
    if (request)
      element.dataset.navigation =
        target > element.scrollLeft ? 'forward' : 'back';
    element.scrollTo({
      left: target,
      behavior: animate ? 'smooth' : 'instant',
    });
    if (!animate) settle();
  }, [page, ref, settle, request]);
  const cancel = useCallback(() => {
    pending.current = null;
    setRequest(null);
    if (ref.current) delete ref.current.dataset.navigation;
  }, [ref]);
  return {
    navigate: (index: number, pointer = true) => {
      requestNavigation(index, pointer);
    },
    cancel,
  };
}
