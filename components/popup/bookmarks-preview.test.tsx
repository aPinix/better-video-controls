// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BookmarksPreview } from './bookmarks-preview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('seeks to each bookmark on the animated click and keeps progress tied to playback', () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const { container } = render(<BookmarksPreview />);
  const video = container.querySelector('video');
  if (!video) throw new Error('Preview video missing');
  Object.defineProperty(video, 'duration', { value: 10 });
  fireEvent.loadedMetadata(video);
  expect(video.currentTime).toBe(0.8);
  expect(video.autoplay).toBe(true);
  const first = container.querySelector('.bookmarks-preview-click-first');
  const second = container.querySelector('.bookmarks-preview-click-second');
  if (!first || !second) throw new Error('Animated bookmark clicks missing');
  // Without AnimationEvent, React uses prefixed animation events in jsdom.
  fireEvent(first, new Event('webkitAnimationStart', { bubbles: true }));
  expect(video.currentTime).toBeCloseTo(2.8);
  video.currentTime = 4;
  fireEvent.timeUpdate(video);
  expect(
    container.querySelector('.origin-left')?.getAttribute('style')
  ).toContain('scaleX(0.4)');
  fireEvent(second, new Event('webkitAnimationStart', { bubbles: true }));
  expect(video.currentTime).toBeCloseTo(6.8);
  fireEvent(first, new Event('webkitAnimationIteration', { bubbles: true }));
  expect(video.currentTime).toBeCloseTo(2.8);
  expect(play).toHaveBeenCalledTimes(3);
});

it('shows a paused bookmark frame for reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { container } = render(<BookmarksPreview />);
  const video = container.querySelector('video');
  if (!video) throw new Error('Preview video missing');
  Object.defineProperty(video, 'duration', { value: 10 });
  fireEvent.loadedMetadata(video);
  expect(video.autoplay).toBe(false);
  expect(video.loop).toBe(false);
  expect(video.currentTime).toBeCloseTo(2.8);
});
