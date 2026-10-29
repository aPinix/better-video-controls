import { useMemo, useRef } from 'react';
import { rememberPopupView } from '@/helpers/popup-view-session';
import { isYouTubeSavedItem } from '@/helpers/saved-media-groups';
import { SavedLibraryPage } from './saved-library-page';
import { SavedLibraryToolbar } from './saved-library-toolbar';
import { useSavedLibrary } from './use-saved-library';
import { useSavedLibraryBrowse } from './use-saved-library-browse';

export function PlayerToolsLibrary({
  isActive = true,
  page,
  onPageChange,
  onBackToSettings,
}: {
  isActive?: boolean;
  page: number;
  onPageChange: (page: number, pointer: boolean) => void;
  onBackToSettings: (pointer: boolean) => void;
}) {
  const storedLibrary = useSavedLibrary();
  const items = useMemo(
    () => storedLibrary.items.filter(isYouTubeSavedItem),
    [storedLibrary.items]
  );
  const library = { ...storedLibrary, items };
  const browse = useSavedLibraryBrowse(items);
  const overviewScroll = useRef<HTMLDivElement>(null);
  const detailScroll = useRef<HTMLDivElement>(null);
  const onSelect = (
    group: Parameters<typeof browse.selectGroup>[0],
    pointer: boolean
  ) => {
    rememberPopupView('library.detail.scroll', 0);
    const viewport = detailScroll.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) viewport.scrollTop = 0;
    browse.selectGroup(group);
    onPageChange(2, pointer);
  };
  return (
    <>
      <SavedLibraryPage
        active={isActive && page === 1}
        browse={browse.overview}
        detail={false}
        library={library}
        onBack={onBackToSettings}
        onSelect={onSelect}
        scrollRef={overviewScroll}
      />
      {browse.selectedUrl && (
        <SavedLibraryPage
          active={isActive && page === 2}
          browse={browse.detail}
          detail
          library={library}
          onBack={(pointer) => onPageChange(1, pointer)}
          onSelect={onSelect}
          scrollRef={detailScroll}
        />
      )}
      <SavedLibraryToolbar
        active={isActive}
        browse={page === 2 ? browse.detail : browse.overview}
      />
    </>
  );
}
