// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MinimalPlayerPreview } from './minimal-player-preview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('compares four platforms and then other sites before restarting', () => {
  vi.useFakeTimers();
  const clear = vi.spyOn(globalThis, 'clearInterval');
  const { getByText, container, unmount } = render(<MinimalPlayerPreview />);
  expect(getByText('Minimal Player off')).toBeTruthy();
  expect(getByText('Minimal Player on')).toBeTruthy();
  expect(getByText('YouTube')).toBeTruthy();
  for (const site of ['Vimeo', 'Instagram', 'TikTok', 'Other sites', 'YouTube']) {
    act(() => vi.advanceTimersByTime(4000));
    expect(getByText(site)).toBeTruthy();
    expect(container.querySelectorAll('video')).toHaveLength(2);
    expect(container.querySelectorAll('.mfs-volume-pill')).toHaveLength(1);
    expect(
      container.querySelectorAll('[data-testid="feature-preview-progress"]')
    ).toHaveLength(1);
  }
  unmount();
  expect(clear).toHaveBeenCalled();
});

it('shows a static comparison when reduced motion is requested', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const intervals = vi.spyOn(globalThis, 'setInterval');
  const { container } = render(<MinimalPlayerPreview />);
  expect(intervals).not.toHaveBeenCalled();
  for (const video of container.querySelectorAll('video'))
    expect(video.autoplay).toBe(false);
});

it('follows Match Site Color and updates the seek bar as the site changes', () => {
  vi.useFakeTimers();
  const { getByTestId, rerender } = render(<MinimalPlayerPreview />);
  const normal = getByTestId('feature-preview-progress').style.background;
  rerender(<MinimalPlayerPreview colorizedTimeline />);
  const youtube = getByTestId('feature-preview-progress').style.background;
  expect(youtube).not.toBe(normal);
  expect(youtube).toContain('255, 0, 0');
  act(() => vi.advanceTimersByTime(4000));
  expect(getByTestId('feature-preview-progress').style.background).toContain(
    '26, 183, 234'
  );
  rerender(<MinimalPlayerPreview colorizedTimeline={false} />);
  expect(getByTestId('feature-preview-progress').style.background).toBe(normal);
});
