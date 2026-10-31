import {
  BookmarkIcon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlayIcon,
  RepeatIcon,
  VideoIcon,
} from 'lucide-react';
import { useState } from 'react';
import { AppHoldToDelete } from '@/components/app/app-hold-to-delete';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/helpers/player-actions';
import type { LibraryCommand, SavedMoment } from '@/helpers/saved-media';
import { cn } from '@/lib/utils';

export function savedItemLink(item: SavedMoment): string {
  if (item.mediaKey.startsWith('youtube:')) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(item.mediaKey.slice(8))}&t=${Math.floor(item.start)}s`;
  }
  const url = new URL(item.url);
  // Media fragments seek direct media URLs. Other pages restore via the extension.
  if (item.mediaKey === `media:${url.origin}${url.pathname}`) {
    url.hash = `t=${item.start}${item.end === undefined ? '' : `,${item.end}`}`;
  }
  return url.href;
}

export function SavedPreview({
  item,
  showTimestamp = true,
  overlay = 'play',
}: {
  item: SavedMoment;
  showTimestamp?: boolean;
  overlay?: 'play' | 'open-video' | 'none';
}) {
  const [failed, setFailed] = useState(false);
  const videoId = item.mediaKey.startsWith('youtube:')
    ? item.mediaKey.slice(8)
    : '';
  const thumbnail = /^[\w-]{11}$/.test(videoId)
    ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    : undefined;
  return (
    <span className="relative flex aspect-video w-26 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      {thumbnail && !failed ? (
        <img
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={thumbnail}
        />
      ) : (
        <VideoIcon aria-hidden="true" className="size-6" />
      )}
      {overlay !== 'none' && (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none',
            overlay === 'open-video'
              ? 'bg-slate-950/70 backdrop-blur-xs'
              : 'bg-black/20'
          )}
        >
          {overlay === 'open-video' ? (
            <ExternalLinkIcon
              aria-hidden="true"
              className="size-6 text-white"
            />
          ) : (
            <PlayIcon
              aria-hidden="true"
              className="size-6 fill-white text-white"
            />
          )}
        </span>
      )}
      {showTimestamp && (
        <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-medium text-white tabular-nums">
          {formatTime(item.start)}
          {item.end === undefined ? '' : `–${formatTime(item.end)}`}
        </span>
      )}
    </span>
  );
}

function SavedItemBadge({ item }: { item: SavedMoment }) {
  const isLoop = item.end !== undefined;
  const Icon = isLoop ? RepeatIcon : BookmarkIcon;
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl',
        isLoop
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
          : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}

export function SavedMediaItem({
  item,
  pending,
  run,
  onDelete,
  report,
  compact = false,
}: {
  item: SavedMoment;
  pending: boolean;
  run: (command: LibraryCommand) => Promise<boolean>;
  onDelete: (item: SavedMoment) => Promise<void>;
  report: (message: string) => void;
  compact?: boolean;
}) {
  const isLoop = item.end !== undefined;
  const KindIcon = isLoop ? RepeatIcon : BookmarkIcon;
  const host = new URL(item.url).hostname.replace(/^www\./, '');
  return (
    <article
      aria-label={`${isLoop ? 'Loop' : 'Bookmark'}: ${item.name}`}
      className="flex min-h-16 flex-col justify-center border-b border-slate-200 py-2 dark:border-slate-800"
    >
      <div className="flex min-h-11 items-center gap-2">
        <a
          aria-disabled={pending || undefined}
          aria-label={`Play ${isLoop ? 'loop' : 'bookmark'}: ${item.name}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          href={savedItemLink(item)}
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            if (!pending) void run({ op: 'open', id: item.id });
          }}
          rel="noopener noreferrer"
          target="_blank"
          title={`Open ${item.title} at ${formatTime(item.start)}`}
        >
          {compact ? (
            <SavedItemBadge item={item} />
          ) : (
            <SavedPreview item={item} />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-h-5 items-center">
              <span
                className={cn(
                  'line-clamp-2 text-xs leading-snug font-semibold text-slate-900 dark:text-slate-100',
                  isLoop
                    ? 'group-hover:text-yellow-800 dark:group-hover:text-yellow-300'
                    : 'group-hover:text-sky-700 dark:group-hover:text-sky-300'
                )}
              >
                {item.name}
              </span>
            </span>
            {!compact && (
              <span
                className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                title={item.title}
              >
                {item.title}
              </span>
            )}
            <span className="flex h-5 min-w-0 items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <KindIcon
                aria-hidden="true"
                className={`size-3 shrink-0 ${isLoop ? 'text-yellow-800 dark:text-yellow-300' : 'text-sky-700 dark:text-sky-300'}`}
              />
              <span
                className={cn(
                  'shrink-0',
                  isLoop
                    ? 'text-yellow-800 dark:text-yellow-300'
                    : 'text-sky-700 dark:text-sky-300'
                )}
              >
                {isLoop ? 'Loop' : 'Bookmark'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">
                {compact
                  ? `${formatTime(item.start)}${item.end === undefined ? '' : `–${formatTime(item.end)}`}`
                  : host}
              </span>
            </span>
          </span>
        </a>
        <fieldset
          aria-label={`Actions for ${item.name}`}
          className="m-0 flex shrink-0 items-center gap-1 border-0 p-0"
        >
          <Button
            aria-label={`Edit ${item.name}`}
            className="rounded-full bg-slate-200/70 p-0 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            disabled={pending}
            onClick={() => void run({ op: 'open', id: item.id, edit: true })}
            size="icon-sm"
            title="Edit in video"
            variant="ghost"
          >
            <PencilIcon aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Copy link for ${item.name}`}
            className="rounded-full bg-slate-200/70 p-0 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            disabled={pending}
            onClick={() => {
              void navigator.clipboard
                .writeText(savedItemLink(item))
                .then(() => report('Link copied.'))
                .catch(() => report('Could not copy the link. Try again.'));
            }}
            size="icon-sm"
            title="Copy link"
            variant="ghost"
          >
            <CopyIcon aria-hidden="true" />
          </Button>
          <AppHoldToDelete
            disabled={pending}
            label={`Delete ${item.name}`}
            onDelete={() => void onDelete(item)}
          />
        </fieldset>
      </div>
    </article>
  );
}
