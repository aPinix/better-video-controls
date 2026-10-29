// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '@/helpers/player-actions';
import {
  LIBRARY_KEY,
  type LibraryCommand,
  libraryRequest,
  type MediaLibrary,
  mergeLibraries,
  type SavedMoment,
} from '@/helpers/saved-media';
import { PlayerToolsLibrary } from './player-tools-library';
import { savedItemLink } from './saved-media-item';
import { usePopupCarousel } from './use-popup-carousel';

vi.mock('@/helpers/saved-media', async (original) => ({
  ...(await original<typeof import('@/helpers/saved-media')>()),
  libraryRequest: vi.fn(),
}));
vi.mock('@/helpers/player-actions', async (original) => ({
  ...(await original<typeof import('@/helpers/player-actions')>()),
  downloadBlob: vi.fn(),
}));

const moment: SavedMoment = {
  id: 'moment',
  mediaKey: 'youtube:aqz-KE-bpKQ',
  url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  title: 'Blender animation',
  name: 'Butterfly scene',
  start: 42,
  createdAt: 100,
};
const loop: SavedMoment = {
  ...moment,
  id: 'loop',
  name: 'Practice section',
  start: 60,
  end: 90,
  createdAt: 200,
};
const direct: SavedMoment = {
  id: 'direct',
  mediaKey: 'media:https://example.com/demo.mp4',
  url: 'https://example.com/demo.mp4',
  title: 'Controls walkthrough',
  name: 'Opening',
  start: 5,
  createdAt: 300,
};
const secondVideo: SavedMoment = {
  ...direct,
  id: 'second-video',
  mediaKey: 'youtube:jNQXAC9IVRw',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
};
let library: MediaLibrary;
let storageChanged: (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string
) => void;

beforeEach(() => {
  library = { version: 1, items: [{ ...moment }, { ...loop }, { ...direct }] };
  vi.mocked(libraryRequest)
    .mockReset()
    .mockImplementation(async (command: LibraryCommand) => {
      if (command.op === 'open') return {};
      if (command.op === 'delete')
        library.items = library.items.filter((item) => item.id !== command.id);
      if (command.op === 'put')
        library.items = [
          ...library.items.filter((item) => item.id !== command.item.id),
          command.item,
        ];
      if (command.op === 'import')
        library = mergeLibraries(library, command.library);
      return { library: { ...library, items: [...library.items] } };
    });
  vi.stubGlobal('chrome', {
    storage: {
      onChanged: {
        addListener: (listener: typeof storageChanged) => {
          storageChanged = listener;
        },
        removeListener: vi.fn(),
      },
    },
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0)
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getAnimations = vi.fn(() => []);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const loaded = async (details = true) => {
  render(<LibraryFixture onBackToSettings={vi.fn()} />);
  await screen.findByRole('button', {
    name: 'Open saves for Blender animation',
  });
  if (details) {
    fireEvent.click(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    );
    await screen.findByRole('link', { name: 'Play bookmark: Butterfly scene' });
  }
};
const actions = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  action: string
) => {
  await user.click(
    screen.getByRole('button', {
      name:
        action === 'Copy link' ? `Copy link for ${name}` : `${action} ${name}`,
    })
  );
};

function LibraryFixture({
  onBackToSettings,
}: {
  onBackToSettings: (pointer: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const { navigate } = usePopupCarousel(ref, page, setPage, (index) => {
    const heading = ref.current?.children[index]?.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  });
  return (
    <div ref={ref}>
      <div />
      <PlayerToolsLibrary
        onBackToSettings={onBackToSettings}
        onPageChange={navigate}
        page={page}
      />
    </div>
  );
}

describe('saved library browsing', () => {
  it('docks search and its rounded filters together and exposes backup buttons', async () => {
    render(
      <>
        <div id="saved-toolbar-root" />
        <LibraryFixture onBackToSettings={vi.fn()} />
      </>
    );
    await screen.findByRole('button', {
      name: 'Open saves for Blender animation',
    });
    const dock = document.getElementById('saved-toolbar-root');
    if (!dock) throw new Error('Saved toolbar dock was not rendered.');
    const search = within(dock).getByLabelText('Saved library search');
    expect(within(search).getByRole('searchbox')).toBeTruthy();
    expect(
      within(search).getByRole('button', { name: 'All 1' }).className
    ).toContain('rounded-full');
    expect(
      within(search).getByRole('button', { name: 'Bookmarks 1' })
    ).toBeTruthy();
    expect(
      within(search).getByRole('button', { name: 'Loops 1' })
    ).toBeTruthy();
    expect(
      screen
        .getByTestId('saved-library-scroll-container')
        .querySelector('search')
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Import library' }).textContent
    ).toContain('Import');
    expect(
      screen.getByRole('button', { name: 'Export library' }).textContent
    ).toContain('Export');
    expect(
      screen.queryByRole('button', { name: 'Library options' })
    ).toBeNull();
  });

  it('keeps the overview mounted and retains its search and sort when returning from details', async () => {
    const user = userEvent.setup();
    await loaded(false);
    await user.type(screen.getByRole('searchbox'), 'Blender');
    await user.click(
      screen.getByRole('button', { name: 'Sort saved items: Newest first' })
    );
    await user.click(screen.getByRole('button', { name: 'Name Z–A' }));
    await user.click(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    );
    await screen.findByRole('link', { name: 'Play bookmark: Butterfly scene' });
    expect(screen.getByRole('searchbox').getAttribute('placeholder')).toBe(
      'Search this video'
    );
    await user.click(
      screen.getByRole('button', { name: 'Sort saved items: Timeline order' })
    );
    await user.click(screen.getByRole('button', { name: 'Name Z–A' }));
    expect(screen.getAllByRole('article')[0]?.textContent).toContain(
      'Practice section'
    );
    await user.click(screen.getByRole('button', { name: 'All videos' }));
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
      'Blender'
    );
    expect(
      screen.getByRole('button', { name: 'Sort saved items: Name Z–A' })
    ).toBeTruthy();
    expect(
      document.querySelectorAll('[aria-label="Saved library"]')
    ).toHaveLength(2);
  });

  it('groups YouTube saves by URL and excludes other sites from browsing and search', async () => {
    const user = userEvent.setup();
    library.items.push(secondVideo);
    await loaded(false);
    let list = screen.getByRole('list', { name: 'Saved videos by URL' });
    expect(within(list).getAllByRole('article')).toHaveLength(2);
    expect(within(list).getAllByRole('button')[0]?.textContent).toContain(
      'Controls walkthrough'
    );
    expect(
      screen.queryByRole('link', { name: 'Play bookmark: Butterfly scene' })
    ).toBeNull();
    expect(
      screen.getByRole('article', { name: 'Saved video: Blender animation' })
        .textContent
    ).toContain('1 bookmark · 1 loop');
    expect(
      screen
        .getByRole('link', { name: 'Open video: Blender animation' })
        .getAttribute('href')
    ).toBe('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    expect(
      screen
        .getByRole('link', { name: 'Open video: Blender animation' })
        .closest('article')
        ?.querySelector('img')?.src
    ).toBe('https://i.ytimg.com/vi/aqz-KE-bpKQ/mqdefault.jpg');
    await user.click(screen.getByRole('button', { name: 'Loops 1' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'All 2' }));
    await user.type(screen.getByRole('searchbox'), 'example.com');
    expect(screen.getByText('No matching saves')).toBeTruthy();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'jNQXAC9IVRw');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('button', {
        name: 'Open saves for Controls walkthrough',
      })
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Clear library search' })
    );
    list = screen.getByRole('list', { name: 'Saved videos by URL' });
    await user.click(
      screen.getByRole('button', { name: 'Sort saved items: Newest first' })
    );
    await user.click(screen.getByRole('button', { name: 'Oldest first' }));
    expect(within(list).getAllByRole('button')[0]?.textContent).toContain(
      'Blender animation'
    );
    await user.click(
      screen.getByRole('button', { name: 'Sort saved items: Oldest first' })
    );
    await user.click(screen.getByRole('button', { name: 'Name A–Z' }));
    expect(within(list).getAllByRole('button')[0]?.textContent).toContain(
      'Blender animation'
    );
    await user.click(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: 'Play bookmark: Opening' })
    ).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Play bookmark: Butterfly scene' })
        .getAttribute('href')
    ).toBe('https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=42s');
    expect(
      screen.getByRole('link', { name: 'Play loop: Practice section' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'All videos' }));
    expect(
      screen.getByRole('list', { name: 'Saved videos by URL' })
    ).toBeTruthy();
  });

  it('uses the background open command to restore a saved loop', async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(
      screen.getByRole('link', { name: 'Play loop: Practice section' })
    );
    expect(libraryRequest).toHaveBeenCalledWith({ op: 'open', id: 'loop' });
    const copied = vi.spyOn(navigator.clipboard, 'writeText');
    await actions(user, 'Practice section', 'Copy link');
    expect(copied).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=60s'
    );
    expect(screen.getByRole('status').textContent).toBe('Link copied.');
  });

  it('does not replace a live library update with a stale initial response', async () => {
    let resolveInitial: (result: { library: MediaLibrary }) => void = () => {};
    vi.mocked(libraryRequest).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInitial = resolve;
      })
    );
    render(<LibraryFixture onBackToSettings={vi.fn()} />);
    act(() =>
      storageChanged(
        { [LIBRARY_KEY]: { newValue: { version: 1, items: [moment] } } },
        'local'
      )
    );
    await screen.findByRole('button', {
      name: 'Open saves for Blender animation',
    });
    await act(async () => {
      resolveInitial({ library: { version: 1, items: [] } });
    });
    expect(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    ).toBeTruthy();
  });

  it.each([
    ['Butterfly scene', 'moment'],
    ['Practice section', 'loop'],
  ])(
    'opens %s in a new video tab for editing without changing the saved record',
    async (name, id) => {
      const user = userEvent.setup();
      await loaded();
      const before = structuredClone(library);
      await actions(user, name, 'Edit');
      expect(libraryRequest).toHaveBeenCalledWith({
        op: 'open',
        id,
        edit: true,
      });
      expect(screen.queryByRole('form')).toBeNull();
      expect(library).toEqual(before);
      expect(
        vi
          .mocked(libraryRequest)
          .mock.calls.some(([command]) => command.op === 'put')
      ).toBe(false);
    }
  );

  it('reports a failed editor launch and keeps the save available to retry', async () => {
    const user = userEvent.setup();
    await loaded();
    vi.mocked(libraryRequest).mockRejectedValueOnce(
      new Error('Could not open a tab.')
    );
    await actions(user, 'Butterfly scene', 'Edit');
    await within(
      screen.getByRole('region', { name: 'Saved library' })
    ).findByText('Could not open a tab.');
    expect(screen.queryByRole('form')).toBeNull();
    expect(
      (
        screen.getByRole('button', {
          name: 'Edit Butterfly scene',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
    expect(library.items.find((item) => item.id === moment.id)).toEqual(moment);
    await actions(user, 'Butterfly scene', 'Edit');
    expect(libraryRequest).toHaveBeenLastCalledWith({
      op: 'open',
      id: moment.id,
      edit: true,
    });
  });

  it('requires a two-second hold to delete a save without offering Undo', async () => {
    const user = userEvent.setup();
    await loaded();
    await actions(user, 'Butterfly scene', 'Delete');
    expect(library.items.find((item) => item.id === moment.id)).toEqual(moment);
    const button = screen.getByRole('button', {
      name: 'Delete Butterfly scene',
    });
    vi.useFakeTimers();
    try {
      fireEvent.keyDown(button, { key: ' ' });
      await act(async () => vi.advanceTimersByTime(1999));
      expect(library.items.find((item) => item.id === moment.id)).toEqual(
        moment
      );
      await act(async () => vi.advanceTimersByTime(1));
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Play bookmark: Butterfly scene' })
      ).toBeNull()
    );
    expect(screen.getByRole('button', { name: 'All 1' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Saved item deleted.');
    expect(library.items.some((item) => item.id === moment.id)).toBe(false);
    expect(library.items.find((item) => item.id === direct.id)).toEqual(direct);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('shows actionable empty and no-results states and updates from other tabs', async () => {
    const user = userEvent.setup();
    library.items = [direct];
    render(<LibraryFixture onBackToSettings={vi.fn()} />);
    await screen.findByText('No saved YouTube bookmarks or loops yet');
    expect(
      screen.queryByRole('button', { name: 'Import a library' })
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Import library' })).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'All 0' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    for (const name of ['Bookmarks 0', 'Loops 0']) {
      const filter = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(filter.disabled).toBe(true);
      await user.click(filter);
      expect(
        screen
          .getByRole('button', { name: 'All 0' })
          .getAttribute('aria-pressed')
      ).toBe('true');
    }
    act(() =>
      storageChanged(
        { [LIBRARY_KEY]: { newValue: { version: 1, items: [moment] } } },
        'local'
      )
    );
    await screen.findByRole('button', {
      name: 'Open saves for Blender animation',
    });
    expect(
      (screen.getByRole('button', { name: 'Bookmarks 1' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    await user.click(
      screen.getByRole('button', { name: 'Open saves for Blender animation' })
    );
    await user.type(screen.getByRole('searchbox'), 'not found');
    expect(screen.getByText('No matching saves')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Show all saves' }));
    expect(
      screen.getByRole('link', { name: 'Play bookmark: Butterfly scene' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Loops 0' }));
    expect(
      (screen.getByRole('button', { name: 'Loops 0' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(
      screen.getByRole('link', { name: 'Play bookmark: Butterfly scene' })
    ).toBeTruthy();
    act(() =>
      storageChanged(
        { [LIBRARY_KEY]: { newValue: { version: 1, items: [moment, loop] } } },
        'local'
      )
    );
    const loopsFilter = await screen.findByRole('button', { name: 'Loops 1' });
    expect((loopsFilter as HTMLButtonElement).disabled).toBe(false);
    await user.click(loopsFilter);
    expect(
      screen.getByRole('link', { name: 'Play loop: Practice section' })
    ).toBeTruthy();
  });

  it('reports a load failure and recovers with retry', async () => {
    const user = userEvent.setup();
    vi.mocked(libraryRequest).mockRejectedValueOnce(
      new Error('Storage unavailable.')
    );
    render(<LibraryFixture onBackToSettings={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Storage unavailable.'
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('button', {
      name: 'Open saves for Blender animation',
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('exports every YouTube save regardless of filter and leaves other-site records in storage', async () => {
    const user = userEvent.setup();
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Loops 1' }));
    await user.click(screen.getByRole('button', { name: 'Export library' }));
    expect(downloadBlob).toHaveBeenCalledWith(
      document,
      expect.any(Blob),
      'better-video-controls-youtube-library.json'
    );
    const blob = vi.mocked(downloadBlob).mock.calls[0]?.[1];
    const exported = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob as Blob);
    });
    expect(JSON.parse(exported)).toEqual({ version: 1, items: [moment, loop] });
    expect(library.items.find((item) => item.id === direct.id)).toEqual(direct);
  });

  it('imports only YouTube entries, preserves existing IDs, and rejects malformed or other-site-only backups', async () => {
    await loaded();
    const fileInput = within(
      screen.getByRole('region', { name: 'Saved library' })
    ).getByLabelText('Import library file');
    const importFile = (content: string) => {
      const file = new File([content], 'library.json', {
        type: 'application/json',
      });
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(content),
      });
      fireEvent.change(fileInput, { target: { files: [file] } });
    };
    importFile(
      JSON.stringify({
        version: 1,
        items: [
          { ...moment, name: 'Old name' },
          { ...moment, id: 'imported', name: 'Imported save' },
          { ...direct, name: 'Old other-site name' },
          { ...direct, id: 'other-import', name: 'Skipped save' },
        ],
      })
    );
    await screen.findByRole('link', { name: 'Play bookmark: Imported save' });
    expect(
      screen.getByRole('link', { name: 'Play bookmark: Butterfly scene' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All 3' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      'Skipped 2 other-site entries'
    );
    expect(library.items.find((item) => item.id === direct.id)).toEqual(direct);
    expect(library.items.some((item) => item.id === 'other-import')).toBe(
      false
    );
    const imports = vi
      .mocked(libraryRequest)
      .mock.calls.filter(([command]) => command.op === 'import');
    expect(imports).toHaveLength(1);
    expect(imports[0]?.[0]).toEqual({
      op: 'import',
      library: {
        version: 1,
        items: [
          { ...moment, name: 'Old name' },
          { ...moment, id: 'imported', name: 'Imported save' },
        ],
      },
    });
    importFile(JSON.stringify({ version: 1, items: [direct] }));
    await within(
      screen.getByRole('region', { name: 'Saved library' })
    ).findByText('This file contains no YouTube bookmarks or loops.');
    expect(
      vi
        .mocked(libraryRequest)
        .mock.calls.filter(([command]) => command.op === 'import')
    ).toHaveLength(1);
    importFile('{broken');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).not.toBe(
        'This file contains no YouTube bookmarks or loops.'
      )
    );
    expect(library.items).toHaveLength(4);
  });

  it('falls back gracefully when a thumbnail fails and creates direct-media timestamp links', async () => {
    await loaded();
    const item = screen.getByRole('region', { name: 'Saved library' });
    const image = item.querySelector('img');
    expect(image).toBeTruthy();
    fireEvent.error(image as HTMLImageElement);
    expect(item.querySelector('img')).toBeNull();
    expect(savedItemLink({ ...direct, end: 12 })).toBe(
      'https://example.com/demo.mp4#t=5,12'
    );
    expect(savedItemLink({ ...direct, url: 'https://example.com/watch' })).toBe(
      'https://example.com/watch'
    );
  });

  it('windows large URL collections and renders the last URL when scrolled', async () => {
    library.items = Array.from({ length: 500 }, (_, index) => ({
      ...moment,
      id: `video-${index}`,
      mediaKey: `youtube:${String(index).padStart(11, '0')}`,
      url: `https://www.youtube.com/watch?v=${String(index).padStart(11, '0')}`,
      title: `Video ${String(index).padStart(3, '0')}`,
      createdAt: 500 - index,
    }));
    render(<LibraryFixture onBackToSettings={vi.fn()} />);
    await screen.findByRole('button', { name: 'Open saves for Video 000' });
    const list = screen.getByRole('list', { name: 'Saved videos by URL' });
    const viewport = screen
      .getByTestId('saved-library-scroll-container')
      .querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    expect(within(list).getAllByRole('listitem').length).toBeLessThan(15);
    expect(
      within(list).getAllByRole('listitem')[0]?.getAttribute('aria-setsize')
    ).toBe('500');
    expect(
      screen.queryByRole('button', { name: 'Open saves for Video 499' })
    ).toBeNull();
    vi.spyOn(list, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, -viewport.scrollTop, 352, 50000)
    );
    viewport.scrollTop = 49800;
    fireEvent.scroll(viewport);
    await screen.findByRole('button', { name: 'Open saves for Video 499' });
    expect(
      screen.queryByRole('button', { name: 'Open saves for Video 000' })
    ).toBeNull();
    expect(within(list).getAllByRole('listitem').length).toBeLessThan(15);
  });

  it('keeps the focused saved item mounted when its virtual row leaves the viewport', async () => {
    library.items = [
      moment,
      ...Array.from({ length: 100 }, (_, index) => ({
        ...moment,
        id: `more-${index}`,
        name: `Moment ${index}`,
        start: index + 100,
      })),
    ];
    await loaded();
    const edit = screen.getByRole('button', { name: 'Edit Butterfly scene' });
    act(() => edit.focus());
    const viewport = screen
      .getByTestId('saved-library-scroll-container')
      .querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    const list = screen.getByRole('list', {
      name: 'Saved bookmarks and loops',
    });
    vi.spyOn(list, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, -viewport.scrollTop, 352, 8080)
    );
    viewport.scrollTop = 7900;
    fireEvent.scroll(viewport);
    await screen.findByRole('link', { name: 'Play bookmark: Moment 99' });
    expect(edit.isConnected).toBe(true);
    expect(document.activeElement).toBe(edit);
    expect(within(list).getAllByRole('listitem').length).toBeLessThan(16);
  });
});
