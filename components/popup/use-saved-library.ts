import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LIBRARY_KEY,
  type LibraryCommand,
  libraryRequest,
  parseLibrary,
  type SavedMoment,
} from '@/helpers/saved-media';

export function useSavedLibrary() {
  const [items, setItems] = useState<SavedMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const busyRef = useRef(false);
  const mounted = useRef(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    setLoading(true);
    setLoadError('');
    try {
      const { library } = await libraryRequest({ op: 'list' });
      if (mounted.current && requestRevision === revision.current)
        setItems(library?.items ?? []);
    } catch (error) {
      if (mounted.current && requestRevision === revision.current)
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Could not load your library.'
        );
    } finally {
      if (mounted.current && requestRevision === revision.current)
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== 'local' || !changes[LIBRARY_KEY]) return;
      revision.current++;
      setLoading(false);
      try {
        setItems(
          changes[LIBRARY_KEY].newValue
            ? parseLibrary(changes[LIBRARY_KEY].newValue).items
            : []
        );
        setLoadError('');
      } catch {
        setLoadError(
          'Could not read your library. Try reloading the extension.'
        );
      }
    };
    chrome.storage.onChanged.addListener(changed);
    void refresh();
    return () => {
      mounted.current = false;
      revision.current++;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, [refresh]);

  const report = (message: string) => {
    setStatus(message);
  };
  const run = async (command: LibraryCommand): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setPending(true);
    setStatus('');
    try {
      const { library } = await libraryRequest(command);
      if (library) {
        revision.current++;
        setItems(library.items);
        setLoadError('');
        setLoading(false);
      }
      return true;
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Could not update your library.'
      );
      return false;
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };
  const deleteItem = async (item: SavedMoment) => {
    if (await run({ op: 'delete', id: item.id })) {
      setStatus('Saved item deleted.');
    }
  };
  return {
    items,
    loading,
    loadError,
    pending,
    status,
    refresh,
    run,
    report,
    deleteItem,
  };
}
