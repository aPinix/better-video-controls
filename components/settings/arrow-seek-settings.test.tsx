// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ArrowSeekSettings } from './arrow-seek-settings';

let preferences: Record<string, unknown>;
const set = vi.fn();
beforeEach(() => {
  preferences = { backward: 3, forward: 10, miniPlayer: true };
  set.mockReset().mockImplementation(async (data) => {
    preferences = data.playerTools;
  });
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get: async () => ({ playerTools: preferences }), set },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('saves one interval for both directions without overwriting other preferences', async () => {
  render(<ArrowSeekSettings />);
  const rewind = screen.getByLabelText(
    'Seek interval (secs)'
  ) as HTMLInputElement;
  await waitFor(() => expect(rewind.value).toBe('3'));
  fireEvent.change(rewind, { target: { value: '7' } });
  fireEvent.blur(rewind);
  await waitFor(() => expect(preferences.backward).toBe(7));
  expect(preferences.forward).toBe(7);
  expect(preferences.miniPlayer).toBe(true);
});

it('restores the default on blur for empty or invalid intervals', async () => {
  render(<ArrowSeekSettings />);
  const forward = screen.getByLabelText(
    'Seek interval (secs)'
  ) as HTMLInputElement;
  await waitFor(() => expect(forward.disabled).toBe(false));
  for (const value of ['', '0', '-5', '86401', '1.5']) {
    fireEvent.change(forward, { target: { value } });
    fireEvent.blur(forward);
    await waitFor(() => expect(forward.value).toBe('5'));
    await waitFor(() => expect(preferences.backward).toBe(5));
    expect(preferences.forward).toBe(5);
  }
  expect(screen.queryByRole('alert')).toBeNull();
});

it('resets both directions to five seconds from the single input', async () => {
  render(<ArrowSeekSettings />);
  await waitFor(() =>
    expect(
      (screen.getByLabelText('Seek interval (secs)') as HTMLInputElement).value
    ).toBe('3')
  );
  expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
  fireEvent.click(
    screen.getByRole('button', { name: 'Reset seek interval to 5 seconds' })
  );
  await waitFor(() => expect(preferences.backward).toBe(5));
  expect(preferences.forward).toBe(5);
});

it('hides the interval when disabled and restores its value when enabled', async () => {
  render(<ArrowSeekSettings />);
  const toggle = screen.getByRole('switch', {
    name: 'Enable Arrow Key Seeking',
  });
  const interval = screen.getByLabelText(
    'Seek interval (secs)'
  ) as HTMLInputElement;
  await waitFor(() => expect(interval.value).toBe('3'));
  fireEvent.click(toggle);
  await waitFor(() => expect(preferences.arrowKeySeekingEnabled).toBe(false));
  await waitFor(() => expect(interval.isConnected).toBe(false));
  expect(screen.queryByRole('spinbutton')).toBeNull();
  expect(preferences.backward).toBe(3);
  expect(preferences.miniPlayer).toBe(true);
  expect(
    screen.queryByRole('button', {
      name: 'Reset seek interval to 5 seconds',
    })
  ).toBeNull();
  fireEvent.click(toggle);
  await waitFor(() => expect(preferences.arrowKeySeekingEnabled).toBe(true));
  const restoredInterval = (await screen.findByRole('spinbutton', {
    name: 'Seek interval (secs)',
  })) as HTMLInputElement;
  expect(restoredInterval.disabled).toBe(false);
  expect(restoredInterval.value).toBe('3');
});

it('loads a saved disabled preference and respects the extension state', async () => {
  preferences.arrowKeySeekingEnabled = false;
  const { rerender } = render(<ArrowSeekSettings />);
  const toggle = screen.getByRole('switch', {
    name: 'Enable Arrow Key Seeking',
  });
  await waitFor(() =>
    expect(toggle.getAttribute('aria-checked')).toBe('false')
  );
  await waitFor(() =>
    expect(screen.queryByLabelText('Seek interval (secs)')).toBeNull()
  );
  expect(screen.queryByRole('spinbutton')).toBeNull();
  rerender(<ArrowSeekSettings disabled />);
  expect(toggle.getAttribute('aria-disabled')).toBe('true');
});

it('keeps storage errors visible when the interval is collapsed', async () => {
  set.mockRejectedValueOnce(new Error('Storage unavailable'));
  render(<ArrowSeekSettings />);
  const toggle = screen.getByRole('switch', {
    name: 'Enable Arrow Key Seeking',
  });
  await waitFor(() =>
    expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
  );
  fireEvent.click(toggle);
  await waitFor(() => expect(screen.queryByRole('spinbutton')).toBeNull());
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Could not save arrow key settings.'
  );
});
