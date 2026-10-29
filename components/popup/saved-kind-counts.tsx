import type { SavedMoment } from '@/helpers/saved-media';

export function SavedKindCounts({ items }: { items: SavedMoment[] }) {
  const loops = items.filter((item) => item.end !== undefined).length;
  const bookmarks = items.length - loops;
  return (
    <span className="text-[10px]">
      {!!bookmarks && (
        <span className="text-sky-700 dark:text-sky-300">
          {bookmarks} {bookmarks === 1 ? 'bookmark' : 'bookmarks'}
        </span>
      )}
      {!!bookmarks && !!loops && <span className="text-slate-400"> · </span>}
      {!!loops && (
        <span className="text-yellow-800 dark:text-yellow-300">
          {loops} {loops === 1 ? 'loop' : 'loops'}
        </span>
      )}
    </span>
  );
}
