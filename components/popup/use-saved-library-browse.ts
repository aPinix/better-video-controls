import { useMemo } from 'react';
import type { SavedMoment } from '@/helpers/saved-media';
import {
  groupSavedMedia,
  type SavedMediaGroup,
  savedMediaUrl,
} from '@/helpers/saved-media-groups';
import { usePopupViewState } from './use-popup-view-memory';

export type SavedLibrarySort =
  | 'newest'
  | 'oldest'
  | 'name'
  | 'name-desc'
  | 'time';
type Filter = 'all' | 'moments' | 'loops';

function useSavedView(
  items: SavedMoment[],
  selectedGroup: SavedMediaGroup | null,
  selectedUrl: string | null,
  filter: Filter,
  setFilter: (filter: Filter) => void,
  detail: boolean
) {
  const prefix = detail ? 'library.detail' : 'library.overview';
  const [query, setQuery] = usePopupViewState(`${prefix}.query`, '');
  const [sort, setSort] = usePopupViewState<SavedLibrarySort>(
    `${prefix}.sort`,
    detail ? 'time' : 'newest'
  );
  const allGroups = useMemo(() => groupSavedMedia(items), [items]);
  const scopedItems = useMemo(
    () =>
      selectedUrl
        ? items.filter((item) => savedMediaUrl(item) === selectedUrl)
        : items,
    [items, selectedUrl]
  );
  const loops = scopedItems.filter((item) => item.end !== undefined).length;
  const filters = [
    {
      id: 'all',
      label: 'All',
      count: detail ? scopedItems.length : allGroups.length,
    },
    {
      id: 'moments',
      label: 'Bookmarks',
      count: detail
        ? scopedItems.length - loops
        : allGroups.filter((group) =>
            group.items.some((item) => item.end === undefined)
          ).length,
    },
    {
      id: 'loops',
      label: 'Loops',
      count: detail
        ? loops
        : allGroups.filter((group) =>
            group.items.some((item) => item.end !== undefined)
          ).length,
    },
  ] as const;
  const term = query.trim().toLocaleLowerCase();
  const visibleItems = useMemo(
    () =>
      scopedItems
        .filter(
          (item) =>
            (filter === 'all' ||
              (filter === 'loops'
                ? item.end !== undefined
                : item.end === undefined)) &&
            `${item.name} ${item.title} ${item.url}`
              .toLocaleLowerCase()
              .includes(term)
        )
        .sort((a, b) =>
          sort === 'time'
            ? a.start - b.start
            : sort === 'name'
              ? a.name.localeCompare(b.name)
              : sort === 'name-desc'
                ? b.name.localeCompare(a.name)
                : sort === 'oldest'
                  ? a.createdAt - b.createdAt
                  : b.createdAt - a.createdAt
        ),
    [scopedItems, filter, term, sort]
  );
  const groups = useMemo(
    () =>
      groupSavedMedia(visibleItems).sort((a, b) =>
        sort === 'name'
          ? a.title.localeCompare(b.title)
          : sort === 'name-desc'
            ? b.title.localeCompare(a.title)
            : sort === 'oldest'
              ? a.oldestAt - b.oldestAt
              : b.newestAt - a.newestAt
      ),
    [visibleItems, sort]
  );
  return {
    query,
    setQuery,
    filter,
    setFilter,
    sort,
    setSort,
    selectedGroup,
    selectedUrl,
    scopedItems,
    filters,
    visibleItems,
    groups,
    term,
  };
}
export type SavedLibraryView = ReturnType<typeof useSavedView>;

export function useSavedLibraryBrowse(items: SavedMoment[]) {
  const [selectedUrl, setSelectedUrl] = usePopupViewState<string | null>(
    'library.selectedUrl',
    null
  );
  const [filter, setFilter] = usePopupViewState<Filter>(
    'library.filter',
    'all'
  );
  const allGroups = useMemo(() => groupSavedMedia(items), [items]);
  const selectedGroup =
    allGroups.find((group) => group.url === selectedUrl) ?? null;
  const overview = useSavedView(items, null, null, filter, setFilter, false);
  const detail = useSavedView(
    items,
    selectedGroup,
    selectedUrl,
    filter,
    setFilter,
    true
  );
  return {
    overview,
    detail,
    selectedUrl,
    selectGroup: (group: SavedMediaGroup) => {
      detail.setQuery('');
      setSelectedUrl(group.url);
    },
  };
}
