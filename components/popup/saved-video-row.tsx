import { ChevronRightIcon, ExternalLinkIcon } from 'lucide-react';
import { SavedPreview } from '@/components/popup/saved-media-item';
import type { SavedMediaGroup } from '@/helpers/saved-media-groups';
import { SavedKindCounts } from './saved-kind-counts';

export function SavedVideoRow({
  group,
  onSelect,
}: {
  group: SavedMediaGroup;
  onSelect: (pointer: boolean) => void;
}) {
  const url = group.url.replace(/^https?:\/\/(www\.)?/, '');
  return (
    <article
      aria-label={`Saved video: ${group.title}`}
      className="relative flex h-25 items-center border-b border-slate-200 dark:border-slate-800"
    >
      <button
        aria-label={`Open saves for ${group.title}`}
        className="group focus-visible:ring-brand flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2"
        onClick={(event) => onSelect(event.detail > 0)}
        type="button"
      >
        <SavedPreview
          item={group.preview}
          overlay="none"
          showTimestamp={false}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="group-hover:text-brand dark:group-hover:text-brand-300 line-clamp-2 text-xs leading-snug font-semibold text-slate-900 dark:text-slate-100">
            {group.title}
          </span>
          <span
            className="truncate text-[10px] text-slate-500 dark:text-slate-400"
            title={group.url}
          >
            {url}
          </span>
          <SavedKindCounts items={group.items} />
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 text-slate-400"
        />
      </button>
      <a
        aria-label={`Open video: ${group.title}`}
        className="absolute top-1/2 left-0 flex aspect-video w-26 -translate-y-1/2 items-center justify-center rounded-[6px] bg-slate-950/70 text-white opacity-0 backdrop-blur-xs transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 motion-reduce:transition-none"
        href={group.url}
        rel="noopener noreferrer"
        target="_blank"
        title="Open video in a new tab"
      >
        <ExternalLinkIcon aria-hidden="true" className="size-6" />
      </a>
    </article>
  );
}
