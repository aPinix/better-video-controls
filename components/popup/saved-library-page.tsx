import {
  ArrowDownAZIcon,
  ArrowLeftIcon,
  ArrowUpAZIcon,
  ClockIcon,
  ListSortAscendingIcon,
  ListSortDescendingIcon,
  XIcon,
} from 'lucide-react';
import { type RefObject, useRef } from 'react';
import {
  AppSortPicker,
  type AppSortPickerOptionI,
} from '@/components/app/app-sort-picker';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollAreaContent } from '@/components/ui/scroll-area';
import type { SavedMediaGroup } from '@/helpers/saved-media-groups';
import { SavedKindCounts } from './saved-kind-counts';
import { SavedLibraryOptions } from './saved-library-options';
import { SavedLibraryResults } from './saved-library-results';
import { SavedPreview } from './saved-media-item';
import { usePopupScrollMemory } from './use-popup-view-memory';
import type { useSavedLibrary } from './use-saved-library';
import type {
  SavedLibrarySort,
  SavedLibraryView,
} from './use-saved-library-browse';

const sortOptions: readonly AppSortPickerOptionI<SavedLibrarySort>[] = [
  { value: 'newest', label: 'Newest first', icon: ListSortDescendingIcon },
  { value: 'oldest', label: 'Oldest first', icon: ListSortAscendingIcon },
  { value: 'name', label: 'Name A–Z', icon: ArrowDownAZIcon },
  { value: 'name-desc', label: 'Name Z–A', icon: ArrowUpAZIcon },
];
const detailSortOptions: readonly AppSortPickerOptionI<SavedLibrarySort>[] = [
  { value: 'time', label: 'Timeline order', icon: ClockIcon },
  ...sortOptions,
];

export function SavedLibraryPage({
  library,
  browse,
  active,
  detail,
  scrollRef,
  onBack,
  onSelect,
}: {
  library: ReturnType<typeof useSavedLibrary>;
  browse: SavedLibraryView;
  active: boolean;
  detail: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onBack: (pointer: boolean) => void;
  onSelect: (group: SavedMediaGroup, pointer: boolean) => void;
}) {
  const importRef = useRef<HTMLInputElement>(null);
  usePopupScrollMemory(
    scrollRef,
    detail ? 'library.detail.scroll' : 'library.overview.scroll'
  );
  const { selectedGroup, scopedItems, visibleItems, groups, sort, setSort } =
    browse;
  return (
    <section
      aria-hidden={!active}
      aria-label="Saved library"
      className="relative flex h-full w-full shrink-0 snap-start snap-always flex-col"
      data-testid={active ? 'youtube-saved-library' : undefined}
      inert={!active}
    >
      <header
        className="absolute top-0 right-2.5 left-0 z-40 pt-20 pr-3.5 pb-3 pl-6"
        data-testid={active ? 'saved-library-header' : undefined}
      >
        {!detail && <h1 className="sr-only">Saved bookmarks &amp; loops</h1>}
        <Button
          className="-ml-1 h-8 px-1 text-xs text-slate-500"
          data-library-back
          onClick={(event) => onBack(event.detail > 0)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon />
          {detail ? 'All videos' : 'YouTube settings'}
        </Button>
        <div className="mt-2 flex min-h-9 items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <span aria-live="polite" className="min-w-0 flex-1">
            {library.loading
              ? 'Loading library…'
              : detail
                ? `${visibleItems.length} ${visibleItems.length === 1 ? 'saved item' : 'saved items'}`
                : `${groups.length} ${groups.length === 1 ? 'URL' : 'URLs'} · ${visibleItems.length} saves`}
          </span>
          <SavedLibraryOptions importRef={importRef} library={library} />
          <AppSortPicker
            className="-mr-1.5"
            label="Sort saved items"
            onValueChange={setSort}
            options={detail ? detailSortOptions : sortOptions}
            placement="below"
            value={sort}
          />
        </div>
      </header>
      <ScrollArea
        className="min-h-0 flex-1 overflow-hidden overscroll-y-contain **:data-[slot='scroll-area-viewport']:relative **:data-[slot='scroll-area-viewport']:overflow-x-hidden! **:data-[slot='scroll-area-viewport']:overscroll-y-contain **:data-[slot='scroll-area-viewport']:[overflow-anchor:none]"
        data-testid={active ? 'saved-library-scroll-container' : undefined}
        ref={scrollRef}
      >
        <ScrollAreaContent
          className="min-h-full pt-49 pb-36"
          style={{ minWidth: 0 }}
        >
          <div className="px-6">
            {detail && selectedGroup && (
              <a
                aria-label={`Open video: ${selectedGroup.title}`}
                className="group focus-visible:ring-brand mb-3 flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2"
                href={selectedGroup.url}
                rel="noopener noreferrer"
                target="_blank"
                title="Open video in a new tab"
              >
                <SavedPreview
                  item={selectedGroup.preview}
                  overlay="open-video"
                  showTimestamp={false}
                />
                <span className="min-w-0">
                  <h1 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedGroup.title}
                  </h1>
                  <span
                    className="mt-1 block truncate text-[10px] text-slate-500 dark:text-slate-400"
                    title={selectedGroup.url}
                  >
                    {selectedGroup.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                  <SavedKindCounts items={scopedItems} />
                </span>
              </a>
            )}
            {library.status && (
              <div
                className="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                role="status"
              >
                <span className="min-w-0 flex-1 break-words">
                  {library.status}
                </span>
                <Button
                  aria-label="Dismiss library message"
                  onClick={() => library.report('')}
                  size="icon-xs"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            )}
            <SavedLibraryResults
              filter={browse.filter}
              groups={groups}
              hasQuery={!!browse.term}
              library={library}
              onImport={() => importRef.current?.click()}
              onReset={() => {
                browse.setQuery('');
                browse.setFilter('all');
              }}
              onSelect={onSelect}
              scrollRef={scrollRef}
              selectedUrl={detail ? browse.selectedUrl : null}
              visibleItems={visibleItems}
            />
          </div>
        </ScrollAreaContent>
      </ScrollArea>
    </section>
  );
}
