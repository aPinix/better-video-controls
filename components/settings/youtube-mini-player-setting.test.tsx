// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  DEFAULT_MINI_PLAYER_GEOMETRY,
  MINI_PLAYER_GEOMETRY_KEY,
} from '@/helpers/mini-player-settings';
import { YouTubeMiniPlayerSetting } from './youtube-mini-player-setting';

const save = vi.fn(async () => {});
const reset = vi.fn(async () => {});
const localGet = vi.fn<() => Promise<Record<string, unknown>>>();
let geometry: unknown;
type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string
) => void;
const listeners = new Set<StorageListener>();
beforeEach(() => {
  save.mockReset();
  reset.mockReset();
  geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY };
  localGet.mockReset().mockImplementation(async () => ({
    [MINI_PLAYER_GEOMETRY_KEY]: geometry,
  }));
  listeners.clear();
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: async () => ({
          playerTools: { dimming: 65, hideEndScreens: true },
        }),
        set: save,
      },
      local: { get: localGet, set: reset },
      onChanged: {
        addListener: (listener: StorageListener) => listeners.add(listener),
        removeListener: (listener: StorageListener) =>
          listeners.delete(listener),
      },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const ready = async () => {
  const toggle = screen.getByRole('switch', {
    name: 'Use Mini Player on YouTube',
  });
  await waitFor(() =>
    expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
  );
  return toggle;
};
const resetButton = () =>
  screen.getByRole('button', {
    name: 'Reset position and size',
  }) as HTMLButtonElement;
const storageChanged = (newValue: unknown, area = 'local') => {
  act(() => {
    for (const listener of listeners)
      listener({ [MINI_PLAYER_GEOMETRY_KEY]: { newValue } }, area);
  });
};
it('defaults on and persists disabling without losing other settings', async () => {
  render(<YouTubeMiniPlayerSetting />);
  const toggle = await ready();
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(toggle);
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      playerTools: expect.objectContaining({
        miniPlayer: false,
        dimming: 65,
        hideEndScreens: true,
      }),
    })
  );
});
it('resets device geometry without changing synced preferences', async () => {
  geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY, x: 100, width: 480 };
  render(<YouTubeMiniPlayerSetting />);
  await ready();
  await waitFor(() => expect(resetButton().disabled).toBe(false));
  fireEvent.click(resetButton());
  await waitFor(() =>
    expect(reset).toHaveBeenCalledWith({
      [MINI_PLAYER_GEOMETRY_KEY]: DEFAULT_MINI_PLAYER_GEOMETRY,
    })
  );
  await waitFor(() => expect(resetButton().disabled).toBe(true));
  fireEvent.click(resetButton());
  expect(reset).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});
it.each([
  ['missing', undefined],
  ['default', DEFAULT_MINI_PLAYER_GEOMETRY],
  ['invalid', { x: 0, y: 0, width: 0 }],
])('disables reset for %s geometry', async (_name, value) => {
  geometry = value;
  render(<YouTubeMiniPlayerSetting />);
  await ready();
  expect(localGet).toHaveBeenCalled();
  expect(resetButton().disabled).toBe(true);
  fireEvent.click(resetButton());
  expect(reset).not.toHaveBeenCalled();
});
it.each(['x', 'y', 'width'] as const)(
  'enables reset when only %s changes',
  async (key) => {
    geometry = {
      ...DEFAULT_MINI_PLAYER_GEOMETRY,
      [key]: DEFAULT_MINI_PLAYER_GEOMETRY[key] + 40,
    };
    render(<YouTubeMiniPlayerSetting />);
    await ready();
    await waitFor(() => expect(resetButton().disabled).toBe(false));
  }
);
it('follows layout changes and resets from other tabs', async () => {
  render(<YouTubeMiniPlayerSetting />);
  await ready();
  expect(resetButton().disabled).toBe(true);
  storageChanged({ ...DEFAULT_MINI_PLAYER_GEOMETRY, x: 100 }, 'sync');
  expect(resetButton().disabled).toBe(true);
  storageChanged({ ...DEFAULT_MINI_PLAYER_GEOMETRY, x: 100 });
  expect(resetButton().disabled).toBe(false);
  storageChanged(DEFAULT_MINI_PLAYER_GEOMETRY);
  expect(resetButton().disabled).toBe(true);
  storageChanged({ ...DEFAULT_MINI_PLAYER_GEOMETRY, width: 480 });
  expect(resetButton().disabled).toBe(false);
  storageChanged(undefined);
  expect(resetButton().disabled).toBe(true);
  expect(reset).not.toHaveBeenCalled();
});
it('disables reset while loading and keeps newer layout changes', async () => {
  let resolveRead!: (data: Record<string, unknown>) => void;
  localGet.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveRead = resolve;
    })
  );
  render(<YouTubeMiniPlayerSetting />);
  await ready();
  expect(resetButton().disabled).toBe(true);
  storageChanged({ ...DEFAULT_MINI_PLAYER_GEOMETRY, x: 100 });
  expect(resetButton().disabled).toBe(false);
  await act(async () => {
    resolveRead({ [MINI_PLAYER_GEOMETRY_KEY]: DEFAULT_MINI_PLAYER_GEOMETRY });
  });
  expect(resetButton().disabled).toBe(false);
});
it('keeps reset disabled and reports a layout loading failure', async () => {
  localGet.mockRejectedValueOnce(new Error('Storage unavailable'));
  render(<YouTubeMiniPlayerSetting />);
  await ready();
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain(
      'Could not load Mini Player position and size'
    )
  );
  expect(resetButton().disabled).toBe(true);
});
it('shows reset and preference storage failures', async () => {
  geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY, x: 100 };
  reset.mockRejectedValueOnce(new Error('Storage unavailable'));
  save.mockRejectedValueOnce(new Error('Storage unavailable'));
  render(<YouTubeMiniPlayerSetting />);
  const toggle = await ready();
  await waitFor(() => expect(resetButton().disabled).toBe(false));
  fireEvent.click(
    screen.getByRole('button', { name: 'Reset position and size' })
  );
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain('Could not reset')
  );
  await waitFor(() => expect(resetButton().disabled).toBe(false));
  fireEvent.click(toggle);
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain(
      'Could not save Mini Player'
    )
  );
  expect(toggle.getAttribute('aria-checked')).toBe('true');
});
it('disables the feature and reset control with the extension', () => {
  render(<YouTubeMiniPlayerSetting disabled />);
  expect(screen.getByRole('switch').getAttribute('aria-disabled')).toBe('true');
  expect(
    (
      screen.getByRole('button', {
        name: 'Reset position and size',
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
});
it('removes its storage listeners on unmount', async () => {
  const { unmount } = render(<YouTubeMiniPlayerSetting />);
  await ready();
  expect(listeners.size).toBeGreaterThan(0);
  unmount();
  expect(listeners.size).toBe(0);
});
