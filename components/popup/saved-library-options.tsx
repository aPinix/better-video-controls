import { DownloadIcon, UploadIcon } from 'lucide-react';
import type { RefObject } from 'react';
import type { useSavedLibrary } from '@/components/popup/use-saved-library';
import { Button } from '@/components/ui/button';
import { downloadBlob } from '@/helpers/player-actions';
import { parseLibrary } from '@/helpers/saved-media';
import { isYouTubeSavedItem } from '@/helpers/saved-media-groups';

export function SavedLibraryOptions({
  library,
  importRef,
}: {
  library: ReturnType<typeof useSavedLibrary>;
  importRef: RefObject<HTMLInputElement | null>;
}) {
  const { items, loading, loadError, pending, run, report } = library;
  return (
    <>
      <fieldset
        aria-label="Library backups"
        className="m-0 flex shrink-0 items-center gap-1 border-0 p-0"
      >
        <Button
          aria-label="Import library"
          className="h-7 gap-1 rounded-full bg-slate-200/70 px-2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          disabled={pending}
          onClick={() => importRef.current?.click()}
          size="sm"
          variant="ghost"
        >
          <DownloadIcon />
          Import
        </Button>
        <Button
          aria-label="Export library"
          className="h-7 gap-1 rounded-full bg-slate-200/70 px-2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          disabled={pending || loading || !!loadError || !items.length}
          onClick={() => {
            downloadBlob(
              document,
              new Blob([JSON.stringify({ version: 1, items }, null, 2)], {
                type: 'application/json',
              }),
              'better-video-controls-youtube-library.json'
            );
            report('Library exported.');
          }}
          size="sm"
          variant="ghost"
        >
          <UploadIcon />
          Export
        </Button>
      </fieldset>
      <input
        accept=".json,application/json"
        aria-label="Import library file"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try {
            if (file.size > 10 * 1024 * 1024)
              throw new Error('Choose a library file smaller than 10 MB.');
            const parsed = parseLibrary(JSON.parse(await file.text()));
            const items = parsed.items.filter(isYouTubeSavedItem);
            if (!items.length)
              throw new Error(
                'This file contains no YouTube bookmarks or loops.'
              );
            const skipped = parsed.items.length - items.length;
            if (await run({ op: 'import', library: { ...parsed, items } })) {
              report(
                `YouTube library imported. ${skipped ? `Skipped ${skipped} other-site ${skipped === 1 ? 'entry' : 'entries'}. ` : ''}Your existing saves were kept.`
              );
            }
          } catch (error) {
            report(
              error instanceof Error
                ? error.message
                : 'Could not import this library.'
            );
          }
        }}
        ref={importRef}
        type="file"
      />
    </>
  );
}
