import { SearchIcon, XIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppInputText } from '@/components/app/app-input-text';
import type { SavedLibraryView } from '@/components/popup/use-saved-library-browse';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SavedLibraryToolbar({
  browse,
  active,
}: {
  browse: SavedLibraryView;
  active: boolean;
}) {
  const { query, setQuery, filter, setFilter, filters, selectedGroup } = browse;
  const inputRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setTarget(document.getElementById('saved-toolbar-root'));
  }, []);
  const toolbar = (
    <search
      aria-label="Saved library search"
      className="relative flex h-12 items-center"
      data-testid="saved-bottom-toolbar"
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3 z-10 size-3.5 text-slate-400"
      />
      <AppInputText
        aria-label="Search YouTube bookmarks and loops"
        className={cn(
          'h-10 rounded-full pl-8 text-xs [&::-webkit-search-cancel-button]:appearance-none',
          query ? 'pr-49' : 'pr-44'
        )}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setQuery('');
        }}
        placeholder={
          selectedGroup ? 'Search this video' : 'Search saved videos'
        }
        ref={inputRef}
        type="search"
        value={query}
      />
      {query && (
        <Button
          aria-label="Clear library search"
          className="absolute top-1/2 right-42 size-5 -translate-y-1/2 rounded-full text-slate-400"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          size="icon-xs"
          variant="ghost"
        >
          <XIcon />
        </Button>
      )}
      <fieldset
        aria-label="Filter saved items"
        className="absolute top-1/2 right-1 m-0 flex w-40 -translate-y-1/2 items-center justify-end gap-1 border-0 p-0"
      >
        {filters.map(({ id, label, count }) => (
          <button
            aria-label={`${label} ${count}`}
            aria-pressed={filter === id}
            className={cn(
              'h-7 cursor-pointer rounded-full px-2 text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 motion-reduce:transition-none',
              filter === id
                ? id === 'moments'
                  ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-900/60 dark:text-sky-300 dark:ring-sky-600'
                  : id === 'loops'
                    ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300 dark:bg-yellow-900/60 dark:text-yellow-300 dark:ring-yellow-600'
                    : 'bg-brand/15 text-brand ring-1 ring-brand/25 dark:bg-brand-400/20 dark:text-brand-200'
                : cn(
                    'bg-white/80 ring-1 ring-slate-300/50 hover:bg-slate-50 dark:bg-slate-700/70 dark:ring-slate-600/40 dark:hover:bg-slate-600',
                    id === 'moments'
                      ? 'text-sky-700 dark:text-sky-300'
                      : id === 'loops'
                        ? 'text-yellow-800 dark:text-yellow-300'
                        : 'text-slate-500 dark:text-slate-300'
                  )
            )}
            disabled={id !== 'all' && count === 0}
            key={id}
            onClick={() => setFilter(id)}
            title={`${label} · ${count}`}
            type="button"
          >
            {label}
          </button>
        ))}
      </fieldset>
    </search>
  );
  return target ? (
    createPortal(toolbar, target)
  ) : (
    <div className="absolute inset-x-4 bottom-15 z-50" inert={!active}>
      {toolbar}
    </div>
  );
}
