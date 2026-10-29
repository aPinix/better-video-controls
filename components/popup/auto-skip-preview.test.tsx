// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AutoSkipPreview } from './auto-skip-preview';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('holds the ended video on the left and scrolls to a playing next video on the right', () => {
  vi.useFakeTimers();
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const { container, unmount } = render(<AutoSkipPreview />);
  const [left, right, next] = container.querySelectorAll('video');
  if (!left || !right || !next) throw new Error('Comparison videos missing');
  for (const video of [left, right, next]) {
    Object.defineProperty(video, 'duration', { value: 10 });
    fireEvent.loadedMetadata(video);
  }
  expect(left.currentTime).toBeCloseTo(7.8);
  expect(right.currentTime).toBeCloseTo(7.8);
  fireEvent.ended(right);
  expect(left.currentTime).toBe(10);
  expect(container.textContent).toContain('Ended');
  expect(play).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(300));
  expect(container.firstElementChild?.className).toContain('phase-next');
  expect(play.mock.contexts).toEqual([next]);
  expect(next.currentTime).toBe(0);
  act(() => vi.advanceTimersByTime(3000));
  expect(container.firstElementChild?.className).toContain('phase-playing');
  expect(left.currentTime).toBeCloseTo(7.8);
  expect(right.currentTime).toBeCloseTo(7.8);
  fireEvent.ended(right);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('shows a static off/on comparison with reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { container } = render(<AutoSkipPreview />);
  expect(container.firstElementChild?.className).toContain('phase-next');
  for (const video of container.querySelectorAll('video'))
    expect(video.autoplay).toBe(false);
});
