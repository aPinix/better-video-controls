import { BookmarkIcon, SearchIcon } from 'lucide-react';
import type { RefObject } from 'react';
import { SavedMediaItem } from '@/components/popup/saved-media-item';
import { SavedVideoRow } from '@/components/popup/saved-video-row';
import type { useSavedLibrary } from '@/components/popup/use-saved-library';
import { VirtualSavedList } from '@/components/popup/virtual-saved-list';
import { Button } from '@/components/ui/button';
import type { SavedMoment } from '@/helpers/saved-media';
import type { SavedMediaGroup } from '@/helpers/saved-media-groups';

const itemKey = (item: SavedMoment) => item.id;
const groupKey = (group: SavedMediaGroup) => group.url;

export function SavedLibraryResults({
  library,
  visibleItems,
  filter,
  hasQuery,
  onReset,
  groups,
  selectedUrl,
  onSelect,
  scrollRef,
}: {
  library: ReturnType<typeof useSavedLibrary>;
  visibleItems: SavedMoment[];
  filter: 'all' | 'moments' | 'loops';
  hasQuery: boolean;
  onReset: () => void;
  groups: SavedMediaGroup[];
  selectedUrl: string | null;
  onSelect: (group: SavedMediaGroup, pointer: boolean) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  if (library.loadError)
    return (
      <div className="py-10 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-300" role="alert">
          {library.loadError}
        </p>
        <Button
          className="mt-3 text-xs"
          onClick={() => void library.refresh()}
          size="sm"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  if (library.loading)
    return (
      <div aria-hidden="true" className="space-y-5 py-3">
        {[0, 1, 2].map((key) => (
          <div
            className="flex items-center gap-3 motion-safe:animate-pulse"
            key={key}
          >
            <div className="aspect-video w-26 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-2 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  if (!library.items.length)
    return (
      <div className="flex flex-col items-center px-5 py-8 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand dark:bg-brand-900/50 dark:text-brand-300">
          <BookmarkIcon aria-hidden="true" className="size-5" />
        </span>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          No saved YouTube bookmarks or loops yet
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Bookmark a moment or save a loop from the YouTube player controls.
          Your saves stay in this browser.
        </p>
      </div>
    );
  if (!visibleItems.length)
    return (
      <div className="px-5 py-10 text-center">
        <SearchIcon
          aria-hidden="true"
          className="mx-auto mb-3 size-5 text-slate-400"
        />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {hasQuery
            ? 'No matching saves'
            : filter === 'loops'
              ? 'No saved loops yet'
              : 'No saved bookmarks yet'}
        </h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {hasQuery
            ? 'Try another name, video title, or URL.'
            : 'Your saved items will appear in this collection.'}
        </p>
        <Button
          className="mt-3 text-xs"
          onClick={onReset}
          size="sm"
          variant="ghost"
        >
          Show all saves
        </Button>
      </div>
    );
  if (selectedUrl)
    return (
      <VirtualSavedList
        estimate={64}
        itemKey={itemKey}
        items={visibleItems}
        key={selectedUrl}
        label="Saved bookmarks and loops"
        renderItem={(item) => (
          <SavedMediaItem
            compact
            item={item}
            onDelete={library.deleteItem}
            pending={library.pending}
            report={library.report}
            run={library.run}
          />
        )}
        scrollRef={scrollRef}
      />
    );
  return (
    <VirtualSavedList
      estimate={100}
      itemKey={groupKey}
      items={groups}
      label="Saved videos by URL"
      renderItem={(group) => (
        <SavedVideoRow
          group={group}
          onSelect={(pointer) => onSelect(group, pointer)}
        />
      )}
      scrollRef={scrollRef}
    />
  );
}
