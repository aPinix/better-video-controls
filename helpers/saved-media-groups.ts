import type { SavedMoment } from './saved-media';

export const isYouTubeSavedItem = (item: SavedMoment): boolean =>
  item.mediaKey.startsWith('youtube:');

export type SavedMediaGroup = {
  url: string;
  title: string;
  preview: SavedMoment;
  items: SavedMoment[];
  newestAt: number;
  oldestAt: number;
};

/** A video's timestamp and YouTube navigation parameters do not make a new URL. */
export function savedMediaUrl(item: SavedMoment): string {
  if (item.mediaKey.startsWith('youtube:')) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(item.mediaKey.slice(8))}`;
  }
  const url = new URL(item.url);
  if (/^#t=/.test(url.hash)) url.hash = '';
  return url.href;
}

export function groupSavedMedia(items: SavedMoment[]): SavedMediaGroup[] {
  const groups = new Map<string, SavedMediaGroup>();
  for (const item of items) {
    const url = savedMediaUrl(item);
    const group = groups.get(url);
    if (group) {
      group.items.push(item);
      group.oldestAt = Math.min(group.oldestAt, item.createdAt);
      if (item.createdAt > group.newestAt) {
        group.newestAt = item.createdAt;
        group.title = item.title || new URL(url).hostname;
        group.preview = item;
      }
    } else {
      groups.set(url, {
        url,
        title: item.title || new URL(url).hostname,
        preview: item,
        items: [item],
        newestAt: item.createdAt,
        oldestAt: item.createdAt,
      });
    }
  }
  return [...groups.values()];
}

export function savedGroupCounts(
  items: SavedMoment[],
  label: 'moment' | 'bookmark' = 'moment'
): string {
  const loops = items.filter((item) => item.end !== undefined).length;
  const moments = items.length - loops;
  return [
    moments ? `${moments} ${label}${moments === 1 ? '' : 's'}` : '',
    loops ? `${loops} ${loops === 1 ? 'loop' : 'loops'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
