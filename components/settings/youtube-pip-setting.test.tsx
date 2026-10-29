// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { YouTubePipSetting } from './youtube-pip-setting';

const save = vi.fn(async () => {});
let preferences: Record<string, unknown>;
let changed: (
  changes: Record<string, chrome.storage.StorageChange>,
  area: string
) => void;
beforeEach(() => {
  save.mockReset();
  preferences = {
    miniPlayer: false,
    dimming: 65,
    youtubePipAutoOnTabChange: true,
  };
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get: async () => ({ playerTools: preferences }), set: save },
      onChanged: {
        addListener: (listener: typeof changed) => {
          changed = listener;
        },
        removeListener: vi.fn(),
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
    name: 'Use PiP Override on YouTube',
  });
  await waitFor(() =>
    expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
  );
  return toggle;
};
it('defaults off and reveals the tab-change sub-option after enabling', async () => {
  preferences.youtubePipAutoOnTabChange = false;
  render(<YouTubePipSetting />);
  const toggle = await ready();
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  expect(
    screen.queryByRole('switch', { name: 'Open PiP when switching tabs' })
  ).toBeNull();
  fireEvent.click(toggle);
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      playerTools: expect.objectContaining({
        youtubePipOverride: true,
        youtubePipAutoOnTabChange: true,
        miniPlayer: false,
        dimming: 65,
      }),
    })
  );
  expect(
    screen
      .getByRole('switch', { name: 'Open PiP when switching tabs' })
      .getAttribute('aria-checked')
  ).toBe('true');
  expect(screen.queryByRole('radio')).toBeNull();
  expect(
    screen.getByRole('figure', { name: 'Custom PiP preview' })
  ).toBeTruthy();
  save.mockClear();
  fireEvent.click(
    screen.getByRole('button', { name: 'Preview flick to a corner' })
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Preview bringing video back' })
  );
  expect(
    screen.getByRole('button', { name: 'Replay PiP preview' })
  ).toBeTruthy();
  expect(save).not.toHaveBeenCalled();
});
it('always previews Custom PiP when overriding, including legacy Chrome mode preferences', async () => {
  preferences.youtubePipOverride = true;
  preferences.youtubePipMode = 'chrome-video';
  render(<YouTubePipSetting />);
  await ready();
  expect(screen.queryByRole('radio')).toBeNull();
  expect(
    screen.getByRole('figure', { name: 'Custom PiP preview' })
  ).toBeTruthy();
  expect(screen.getByLabelText('YouTube shortcut: O')).toBeTruthy();
  expect(screen.queryByLabelText('YouTube shortcut: P')).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
it('saves the sub-option without changing PiP or Mini Player preferences', async () => {
  preferences.youtubePipOverride = true;
  render(<YouTubePipSetting />);
  await ready();
  fireEvent.click(
    screen.getByRole('switch', { name: 'Open PiP when switching tabs' })
  );
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      playerTools: expect.objectContaining({
        youtubePipOverride: true,
        youtubePipAutoOnTabChange: false,
        miniPlayer: false,
      }),
    })
  );
});
it('shows storage errors without enabling the override', async () => {
  save.mockRejectedValueOnce(new Error('Storage unavailable'));
  render(<YouTubePipSetting />);
  const toggle = await ready();
  fireEvent.click(toggle);
  await waitFor(() =>
    expect(screen.getByRole('alert').textContent).toContain(
      'Could not save PiP Override'
    )
  );
  expect(toggle.getAttribute('aria-checked')).toBe('false');
});
it('disables both switches with the extension', async () => {
  preferences.youtubePipOverride = true;
  render(<YouTubePipSetting disabled />);
  await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(2));
  for (const toggle of screen.getAllByRole('switch'))
    expect(toggle.getAttribute('aria-disabled')).toBe('true');
  expect(
    screen.queryByRole('group', { name: 'YouTube PiP player' })
  ).toBeNull();
});
