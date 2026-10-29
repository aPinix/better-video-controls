import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LIBRARY_MESSAGE,
  type LibraryCommand,
  registerLibraryBackground,
  type SavedMoment,
} from './saved-media';

let listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0];
let local: Record<string, unknown>;
let session: Record<string, unknown>;
const updateTab = vi.fn();
const item: SavedMoment = {
  id: 'one',
  mediaKey: 'youtube:abc',
  url: 'https://www.youtube.com/watch?v=abc',
  name: 'First part',
  title: 'Lesson',
  start: 10,
  createdAt: 123,
};
const request = (command: LibraryCommand, tabId = 1) =>
  new Promise<Record<string, unknown>>((resolve) => {
    listener(
      { type: LIBRARY_MESSAGE, command },
      { id: 'extension', tab: { id: tabId } as chrome.tabs.Tab },
      resolve
    );
  });
beforeEach(() => {
  local = {};
  session = {};
  updateTab.mockReset();
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'extension',
      onMessage: {
        addListener: (fn: typeof listener) => {
          listener = fn;
        },
      },
    },
    storage: {
      local: {
        get: async () => structuredClone(local),
        set: async (value: object) => {
          Object.assign(local, value);
        },
      },
      session: {
        get: async () => structuredClone(session),
        set: async (value: object) => {
          Object.assign(session, value);
        },
        remove: async (key: string) => {
          delete session[key];
        },
      },
    },
    tabs: {
      create: async () => ({ id: 99 }),
      update: updateTab,
      onRemoved: { addListener: vi.fn() },
    },
  });
  registerLibraryBackground();
});
afterEach(() => vi.unstubAllGlobals());
describe('saved library background coordination', () => {
  it('keeps bookmarks and loop sections when the browser session and background worker restart', async () => {
    const section = { ...item, id: 'loop', start: 30, end: 45 };
    await request({ op: 'put', item });
    await request({
      op: 'replace-loops',
      mediaKey: item.mediaKey,
      items: [section],
    });
    session = {};
    registerLibraryBackground();
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [item, section],
    });
  });
  it('replaces a video’s loop sections atomically while preserving bookmarks and other videos', async () => {
    const first = { ...item, id: 'first', end: 20 };
    const second = { ...item, id: 'second', start: 30, end: 40 };
    const other = {
      ...first,
      id: 'other',
      mediaKey: 'youtube:other',
      url: 'https://www.youtube.com/watch?v=other',
    };
    for (const entry of [item, first, second, other])
      await request({ op: 'put', item: entry });
    const replacement = { ...first, id: 'replacement', start: 5, end: 80 };
    await request({
      op: 'replace-loops',
      mediaKey: item.mediaKey,
      items: [replacement],
    });
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [item, other, replacement],
    });
    for (const invalid of [item, other, { ...replacement, id: item.id }])
      expect(
        await request({
          op: 'replace-loops',
          mediaKey: item.mediaKey,
          items: [invalid],
        })
      ).toHaveProperty('error');
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(
      new Error('Storage unavailable')
    );
    expect(
      await request({
        op: 'replace-loops',
        mediaKey: item.mediaKey,
        items: [first],
      })
    ).toHaveProperty('error');
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [item, other, replacement],
    });
  });
  it('replaces only one video bookmarks atomically and preserves sections and other videos', async () => {
    const section = { ...item, id: 'section', end: 20 };
    const other = {
      ...item,
      id: 'other',
      mediaKey: 'youtube:other',
      url: 'https://www.youtube.com/watch?v=other',
    };
    for (const entry of [item, section, other])
      await request({ op: 'put', item: entry });
    await request({
      op: 'replace-bookmarks',
      mediaKey: item.mediaKey,
      items: [],
    });
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [section, other],
    });
    await request({
      op: 'replace-bookmarks',
      mediaKey: item.mediaKey,
      items: [item],
    });
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [section, other, item],
    });
    expect(
      await request({
        op: 'replace-bookmarks',
        mediaKey: item.mediaKey,
        items: [other],
      })
    ).toHaveProperty('error');
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(
      new Error('Storage unavailable')
    );
    expect(
      await request({
        op: 'replace-bookmarks',
        mediaKey: item.mediaKey,
        items: [],
      })
    ).toHaveProperty('error');
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [section, other, item],
    });
  });
  it('serializes simultaneous saves from different tabs without dropping items', async () => {
    await Promise.all([
      request({ op: 'put', item }),
      request({ op: 'put', item: { ...item, id: 'two' } }, 2),
    ]);
    const result = await request({ op: 'list' });
    expect(result.library).toMatchObject({
      items: [{ id: 'one' }, { id: 'two' }],
    });
  });
  it('opens saved items and only lets the matching video in the target tab claim them', async () => {
    await request({ op: 'put', item });
    await request({ op: 'open', id: item.id });
    expect(updateTab).toHaveBeenCalledWith(99, { url: item.url });
    expect(
      await request({ op: 'claim', mediaKey: 'youtube:wrong' }, 99)
    ).toEqual({});
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 1)).toEqual(
      {}
    );
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 99)).toEqual(
      { item }
    );
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 99)).toEqual(
      {}
    );
  });
  it.each([undefined, 25])(
    'hands off the editor intent for a saved item with end %s only to its target video and tab',
    async (end) => {
      const saved = { ...item, ...(end === undefined ? {} : { end }) };
      await request({ op: 'put', item: saved });
      await request({ op: 'open', id: saved.id, edit: true });
      expect(updateTab).toHaveBeenCalledWith(99, { url: saved.url });
      expect(session['mfsPending:99']).toMatchObject({
        item: saved,
        edit: true,
      });
      expect(
        await request({ op: 'claim', mediaKey: 'youtube:wrong' }, 99)
      ).toEqual({});
      expect(
        await request({ op: 'claim', mediaKey: saved.mediaKey }, 1)
      ).toEqual({});
      expect(
        await request({ op: 'claim', mediaKey: saved.mediaKey }, 99)
      ).toEqual({ item: saved, edit: true });
      expect(
        await request({ op: 'claim', mediaKey: saved.mediaKey }, 99)
      ).toEqual({});
      expect((await request({ op: 'list' })).library).toMatchObject({
        items: [saved],
      });
    }
  );

  it('uses the latest saved values for Edit and does not restore deleted saves', async () => {
    await request({ op: 'put', item });
    await request({ op: 'open', id: item.id, edit: true });
    const updated = { ...item, name: 'Updated before loading', start: 12 };
    await request({ op: 'put', item: updated });
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 99)).toEqual(
      { item: updated, edit: true }
    );
    await request({ op: 'open', id: item.id, edit: true });
    await request({ op: 'delete', id: item.id });
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 99)).toEqual(
      {}
    );
    expect(session['mfsPending:99']).toBeUndefined();
  });

  it('does not let an expired editor request be claimed', async () => {
    await request({ op: 'put', item });
    await request({ op: 'open', id: item.id, edit: true });
    (session['mfsPending:99'] as { expires: number }).expires = Date.now() - 1;
    expect(await request({ op: 'claim', mediaKey: item.mediaKey }, 99)).toEqual(
      {}
    );
    expect(session['mfsPending:99']).toBeUndefined();
  });

  it('reports invalid mutations without changing the saved library', async () => {
    await request({ op: 'put', item });
    expect(
      await request({ op: 'put', item: { ...item, start: -1 } })
    ).toHaveProperty('error');
    expect((await request({ op: 'list' })).library).toMatchObject({
      items: [item],
    });
  });
});
