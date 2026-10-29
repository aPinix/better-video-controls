// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.youtube.com/watch?v=startup-test"}
import { afterEach, expect, it, vi } from 'vitest';
import { OverlayCreator } from './overlay-creator';
import { SettingsManager } from './settings-manager';
import { VideoStateManager } from './video-state';

let states: VideoStateManager | undefined;
afterEach(() => {
  states?.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

it('restores markers before opening the editor through the complete YouTube startup path', async () => {
  vi.useFakeTimers();
  const stored = {
    isEnabled: true,
    isTimelineSeekingEnabled: true,
    domainRules: [{ domain: '*', enabled: true, type: 'whitelist' }],
  };
  const get = (_keys: unknown, callback?: (value: object) => void) => {
    callback?.(stored);
    return Promise.resolve(stored);
  };
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get, set: vi.fn(async () => {}) },
      local: { get: async () => ({}), set: vi.fn(async () => {}) },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    runtime: {
      sendMessage: vi.fn(async ({ command }) => ({
        library: {
          version: 1,
          items:
            command.op === 'list'
              ? [
                  {
                    id: 'bookmark',
                    mediaKey: 'youtube:startup-test',
                    url: location.href,
                    title: 'Test',
                    name: 'Saved bookmark',
                    start: 30,
                    createdAt: 1,
                  },
                  {
                    id: 'loop',
                    mediaKey: 'youtube:startup-test',
                    url: location.href,
                    title: 'Test',
                    name: 'Saved loop',
                    start: 50,
                    end: 70,
                    createdAt: 1,
                  },
                ]
              : [],
        },
      })),
    },
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  document.body.innerHTML =
    '<div id="movie_player" class="html5-video-player"><video></video><div class="ytp-right-controls"><button class="ytp-subtitles-button"></button></div></div>';
  const video = document.querySelector('video') as HTMLVideoElement;
  Object.defineProperties(video, {
    readyState: { value: 4 },
    duration: { value: Number.NaN, configurable: true },
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  video.getBoundingClientRect = () => new DOMRect(0, 100, 800, 450);
  (video.parentElement as HTMLElement).getBoundingClientRect =
    video.getBoundingClientRect;
  const settings = new SettingsManager();
  await settings.initialize();
  expect(settings.shouldRun()).toBe(true);
  states = new VideoStateManager();
  const creator = new OverlayCreator(settings, states, () => {});
  expect(() => creator.createScrubOverlay(video)).not.toThrow();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.querySelector('.mfs-loop-button')).not.toBeNull();
  const track = states
    .get(video)
    ?.timeline.querySelector('.mfs-loop-surface')
    ?.shadowRoot?.querySelector<HTMLElement>('.timeline');
  expect(track?.querySelectorAll('.marker,.saved-range')).toHaveLength(0);
  Object.defineProperty(video, 'duration', { value: 120, configurable: true });
  video.dispatchEvent(new Event('loadedmetadata'));
  await vi.advanceTimersByTimeAsync(0);
  expect(track?.querySelectorAll('.marker')).toHaveLength(1);
  expect(track?.querySelectorAll('.saved-range')).toHaveLength(1);
  expect(track?.hidden).toBe(false);
  expect(track?.classList.contains('editing')).toBe(false);
  document.querySelector('.mfs-loop-button')?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
    })
  );
  expect(states.get(video)?.timeline.dataset.mfsLoopEditing).toBe('true');
});
