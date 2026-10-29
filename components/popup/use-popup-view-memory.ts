import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { readPopupView, rememberPopupView } from '@/helpers/popup-view-session';

export function usePopupViewState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readPopupView(key, fallback));
  useEffect(() => {
    rememberPopupView(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

export function usePopupScrollMemory(
  ref: RefObject<HTMLDivElement | null>,
  key: string
) {
  useLayoutEffect(() => {
    const viewport = ref.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;
    const requested = Math.max(0, readPopupView(key, 0));
    let restoring = requested > 0;
    let frame = 0;
    const restore = () => {
      if (!restoring) return;
      viewport.scrollTop = requested;
      if (viewport.scrollHeight - viewport.clientHeight >= requested)
        restoring = false;
    };
    const save = () => {
      if (!restoring) rememberPopupView(key, viewport.scrollTop);
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(restore);
          });
    observer?.observe(viewport);
    if (viewport.firstElementChild)
      observer?.observe(viewport.firstElementChild);
    restore();
    const timer = setTimeout(() => {
      restore();
      restoring = false;
    }, 700);
    viewport.addEventListener('scroll', save, { passive: true });
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      viewport.removeEventListener('scroll', save);
      save();
    };
  }, [ref, key]);
}
