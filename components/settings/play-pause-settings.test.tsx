// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PlayPauseSettings } from './play-pause-settings';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const props = () => ({
  enabled: true,
  middleClickEnabled: true,
  wheelEnabled: false,
  kKeyEnabled: true,
  onKKeyEnabledChange: vi.fn(),
  onEnabledChange: vi.fn(),
  onMiddleClickEnabledChange: vi.fn(),
  onWheelEnabledChange: vi.fn(),
});

it('only toggles through switches and keeps the two gestures independent', async () => {
  const user = userEvent.setup();
  const settings = props();
  render(<PlayPauseSettings {...settings} />);
  await user.click(screen.getByText('Play / Pause'));
  await user.click(screen.getByText('Middle-click'));
  expect(settings.onEnabledChange).not.toHaveBeenCalled();
  expect(settings.onMiddleClickEnabledChange).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole('switch', { name: 'Enable middle-click play pause' })
  );
  expect(settings.onMiddleClickEnabledChange).toHaveBeenCalledWith(false);
  expect(settings.onWheelEnabledChange).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole('switch', {
      name: 'Enable directional play pause wheel actions',
    })
  );
  expect(settings.onWheelEnabledChange).toHaveBeenCalledWith(true);
  await user.click(screen.getByRole('switch', { name: 'Enable Play / Pause' }));
  expect(settings.onEnabledChange).toHaveBeenCalledWith(false);
});

it('preserves the sub-option values when the master option is switched off and on', () => {
  const settings = props();
  const { rerender } = render(<PlayPauseSettings {...settings} />);
  rerender(<PlayPauseSettings {...settings} enabled={false} />);
  expect(
    screen.queryByRole('switch', { name: 'Enable middle-click play pause' })
  ).toBeNull();
  rerender(<PlayPauseSettings {...settings} />);
  expect(
    screen
      .getByRole('switch', { name: 'Enable middle-click play pause' })
      .getAttribute('aria-checked')
  ).toBe('true');
  expect(
    screen
      .getByRole('switch', {
        name: 'Enable directional play pause wheel actions',
      })
      .getAttribute('aria-checked')
  ).toBe('false');
  expect(settings.onMiddleClickEnabledChange).not.toHaveBeenCalled();
  expect(settings.onWheelEnabledChange).not.toHaveBeenCalled();
});

it.each([
  ['MacIntel', 'Command', '⌘'],
  ['Win32', 'Ctrl', 'Ctrl'],
])('shows complete shortcut pills on %s', (platform, label, symbol) => {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  render(<PlayPauseSettings {...props()} />);
  for (const direction of ['Left', 'Right']) {
    const pill = screen.getByLabelText(`${label} + Scroll ${direction}`);
    expect(pill.tagName).toBe('KBD');
    expect(pill.textContent).toBe(`${symbol} + Scroll ${direction}`);
  }
});
