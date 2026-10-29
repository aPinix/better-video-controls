import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  readPopupView,
  resetPopupLibraryView,
} from '@/helpers/popup-view-session';
import { usePopupCarousel } from './use-popup-carousel';
import {
  usePopupScrollMemory,
  usePopupViewState,
} from './use-popup-view-memory';

export function useYouTubeLibraryPage(active: boolean) {
  const [page, setPage] = usePopupViewState('settings.page', 0);
  const [hasLibrary, setHasLibrary] = useState(page > 0);
  const [searchActivation, setSearchActivation] = useState<
    'focus' | 'preserve'
  >(
    readPopupView('settings.scroll', 0) || readPopupView('settings.query', '')
      ? 'preserve'
      : 'focus'
  );
  const surfaceRef = useRef<HTMLDivElement>(null);
  const preferencesScrollRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(readPopupView('settings.scroll', 0));
  const restorePending = useRef(false);
  usePopupScrollMemory(preferencesScrollRef, 'settings.scroll');
  const restorePreferences = useCallback(() => {
    const viewport = preferencesScrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) viewport.scrollTop = scrollPosition.current;
    entryRef.current?.querySelector('button')?.focus({ preventScroll: true });
    restorePending.current = false;
  }, []);
  const changePage = (index: number) => {
    setPage(Math.max(0, Math.min(2, index)));
    if (index === 0 && hasLibrary) {
      restorePending.current = true;
      setSearchActivation('preserve');
    }
  };
  const { navigate, cancel } = usePopupCarousel(
    surfaceRef,
    page,
    changePage,
    (index) => {
      if (index === 0) {
        setHasLibrary(false);
      } else {
        const panel = surfaceRef.current?.children[index];
        const target =
          panel?.querySelector<HTMLElement>('h1') ??
          panel?.querySelector<HTMLElement>('[data-library-back]');
        if (target) {
          if (target.tagName === 'H1') target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
      }
    }
  );
  const leave = useCallback(() => {
    cancel();
    if (hasLibrary) {
      restorePending.current = true;
      setSearchActivation('preserve');
      setPage(0);
      setHasLibrary(false);
      if (surfaceRef.current) surfaceRef.current.scrollLeft = 0;
    }
  }, [cancel, hasLibrary, setPage]);
  useEffect(() => {
    if (!active && hasLibrary) leave();
  }, [active, hasLibrary, leave]);
  useLayoutEffect(() => {
    if (active && !hasLibrary && restorePending.current) restorePreferences();
  }, [active, hasLibrary, restorePreferences]);
  const open = (pointer: boolean) => {
    const viewport = preferencesScrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    scrollPosition.current = viewport?.scrollTop ?? 0;
    viewport?.scrollTo?.({ top: scrollPosition.current, behavior: 'instant' });
    resetPopupLibraryView();
    setHasLibrary(true);
    navigate(1, pointer);
  };
  const back = (pointer: boolean) => {
    restorePending.current = true;
    setSearchActivation('preserve');
    navigate(0, pointer);
  };
  return {
    page,
    hasLibrary,
    isOpen: page > 0,
    open,
    back,
    leave,
    navigate,
    searchActivation,
    surfaceRef,
    preferencesScrollRef,
    entryRef,
  };
}
