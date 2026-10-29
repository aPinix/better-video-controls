// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaybackSpeedPreview } from './playback-speed-preview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('changes actual playback from normal to twice as fast and loops the comparison', () => {
  vi.useFakeTimers();
  const intervals = vi.spyOn(globalThis, 'setInterval');
  const clear = vi.spyOn(globalThis, 'clearInterval');
  const { container, getByText, unmount } = render(<PlaybackSpeedPreview />);
  const video = container.querySelector('video');
  if (!video) throw new Error('Preview video missing');
  fireEvent.loadedMetadata(video);
  expect(video.playbackRate).toBe(1);
  expect(getByText('Normal speed')).toBeTruthy();
  act(() => vi.advanceTimersByTime(3000));
  expect(video.playbackRate).toBe(2);
  expect(getByText('Twice as fast')).toBeTruthy();
  act(() => vi.advanceTimersByTime(3000));
  expect(video.playbackRate).toBe(1);
  expect(getByText('Normal speed')).toBeTruthy();
  unmount();
  expect(clear).toHaveBeenCalledWith(intervals.mock.results[0]?.value);
});

it('keeps a still preview when reduced motion is requested', () => {
  vi.useFakeTimers();
  const intervals = vi.spyOn(globalThis, 'setInterval');
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { container } = render(<PlaybackSpeedPreview />);
  const video = container.querySelector('video');
  if (!video) throw new Error('Preview video missing');
  fireEvent.loadedMetadata(video);
  expect(video.autoplay).toBe(false);
  expect(intervals).not.toHaveBeenCalled();
});
