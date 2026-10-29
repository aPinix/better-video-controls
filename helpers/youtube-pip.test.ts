// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.youtube.com/watch?v=test"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installYouTubePipBridge,
  normalizeYouTubePipSize,
  type PipWindow,
  YOUTUBE_PIP_REQUEST,
  YOUTUBE_PIP_RESULT,
  YOUTUBE_PIP_SETTINGS_CHANGED,
} from './youtube-pip';

let cleanup: (() => void) | undefined;
let video: HTMLVideoElement;
let request: ReturnType<typeof vi.fn<() => Promise<Window>>>;
let nativeRequest: ReturnType<typeof vi.fn>;
let setAction: ReturnType<typeof vi.fn>;
let handler: MediaSessionActionHandler;
let hidden: boolean;
const pip = {
  innerWidth: 480,
  innerHeight: 270,
  addEventListener: vi.fn(),
} as unknown as Window;
beforeEach(() => {
  hidden = false;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  document.body.innerHTML = '<video></video>';
  video = document.querySelector('video') as HTMLVideoElement;
  Object.defineProperties(video, {
    paused: { configurable: true, value: false },
    ended: { configurable: true, value: false },
  });
  nativeRequest = vi.fn(async () => ({ width: 640, height: 360 }));
  vi.stubGlobal('documentPictureInPicture', {
    window: null,
    requestWindow: vi.fn(async () => pip),
  });
  Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
    configurable: true,
    writable: true,
    value: nativeRequest,
  });
  setAction = vi.fn((_action, callback) => {
    handler = callback;
  });
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: { setActionHandler: setAction },
  });
  request = vi.fn(() => Promise.resolve(pip));
  video.addEventListener(YOUTUBE_PIP_REQUEST, (event) => {
    event.preventDefault();
    void request().then((result) => {
      const api = (window as PipWindow).documentPictureInPicture;
      if (api) api.window = result;
      video.dispatchEvent(new Event(YOUTUBE_PIP_RESULT));
    });
  });
  cleanup = installYouTubePipBridge(document);
});
afterEach(() => {
  cleanup?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
const enable = (auto = false) => {
  video.dataset.mfsPipOverride = 'true';
  video.dataset.mfsPipAuto = String(auto);
  document.dispatchEvent(new Event(YOUTUBE_PIP_SETTINGS_CHANGED));
};
describe('YouTube PiP bridge', () => {
  it('registers automatic PiP when preferences were applied before the bridge started', async () => {
    cleanup?.();
    enable(true);
    setAction.mockClear();
    cleanup = installYouTubePipBridge(document);
    expect(setAction).toHaveBeenCalledWith(
      'enterpictureinpicture',
      expect.any(Function)
    );
    handler({
      action: 'enterpictureinpicture',
      reason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
  });
  it.each(['play', 'pageshow'])(
    'retries browser registration on %s after an initial failure',
    (type) => {
      setAction.mockImplementationOnce(() => {
        throw new Error('Media session not ready');
      });
      enable(true);
      setAction.mockClear();
      if (type === 'play') video.dispatchEvent(new Event(type));
      else window.dispatchEvent(new Event(type));
      expect(setAction).toHaveBeenCalledWith(
        'enterpictureinpicture',
        expect.any(Function)
      );
      cleanup?.();
      cleanup = undefined;
      setAction.mockClear();
      video.dispatchEvent(new Event('play'));
      window.dispatchEvent(new Event('pageshow'));
      expect(setAction).not.toHaveBeenCalled();
    }
  );
  it('opens the playing replacement video instead of a cached paused video', async () => {
    enable(true);
    Object.defineProperty(video, 'paused', { value: true });
    const next = document.createElement('video');
    next.dataset.mfsPipOverride = next.dataset.mfsPipAuto = 'true';
    Object.defineProperties(next, {
      paused: { value: false },
      ended: { value: false },
    });
    document.body.append(next);
    const opened = vi.fn((event: Event) => {
      event.preventDefault();
      const api = (window as PipWindow).documentPictureInPicture;
      if (api) api.window = pip;
      next.dispatchEvent(new Event(YOUTUBE_PIP_RESULT));
    });
    next.addEventListener(YOUTUBE_PIP_REQUEST, opened);
    handler({
      action: 'enterpictureinpicture',
      reason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails);
    await vi.waitFor(() => expect(opened).toHaveBeenCalledOnce());
    expect(request).not.toHaveBeenCalled();
  });
  it('prefers the actual YouTube player over another playing video on the page', () => {
    const player = document.createElement('div');
    player.id = 'movie_player';
    const mainVideo = document.createElement('video');
    mainVideo.dataset.mfsPipOverride = mainVideo.dataset.mfsPipAuto = 'true';
    Object.defineProperties(mainVideo, {
      paused: { value: false },
      ended: { value: false },
    });
    player.append(mainVideo);
    document.body.append(player);
    const opened = vi.fn((event: Event) => event.preventDefault());
    mainVideo.addEventListener(YOUTUBE_PIP_REQUEST, opened);
    enable(true);
    handler({
      action: 'enterpictureinpicture',
      reason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails);
    expect(opened).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps the current PiP video selected while other videos start on the source page', async () => {
    enable(true);
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const pipWindow = frame.contentWindow as Window;
    pipWindow.document.body.append(video);
    const api = (window as PipWindow).documentPictureInPicture;
    if (api) api.window = pipWindow;
    const next = document.createElement('video');
    next.dataset.mfsPipOverride = next.dataset.mfsPipAuto = 'true';
    Object.defineProperty(next, 'paused', { value: false });
    document.body.append(next);
    const opened = vi.fn((event: Event) => event.preventDefault());
    next.addEventListener(YOUTUBE_PIP_REQUEST, opened);
    handler({
      action: 'enterpictureinpicture',
      reason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    expect(opened).not.toHaveBeenCalled();
  });
  it('passes automatic versus explicit request origin across the bridge and removes temporary metadata', async () => {
    const origins: Array<string | undefined> = [];
    video.addEventListener(YOUTUBE_PIP_REQUEST, () =>
      origins.push(video.dataset.mfsPipAutomaticRequest)
    );
    enable(true);
    handler({
      action: 'enterpictureinpicture',
      enterPictureInPictureReason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await video.requestPictureInPicture();
    await video.requestPictureInPicture();
    expect(origins).toEqual(['true', 'false']);
    expect(video.dataset.mfsPipAutomaticRequest).toBeUndefined();
  });
  it('uses Chrome video PiP for explicit and automatic requests in the selected mode', async () => {
    video.dataset.mfsPipMode = 'chrome-video';
    enable(false);
    expect(await video.requestPictureInPicture()).toEqual({
      width: 640,
      height: 360,
    });
    const automatic = {
      action: 'enterpictureinpicture',
      enterPictureInPictureReason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails;
    handler(automatic);
    expect(nativeRequest).toHaveBeenCalledOnce();
    enable(true);
    handler(automatic);
    await vi.waitFor(() => expect(nativeRequest).toHaveBeenCalledTimes(2));
    expect(request).not.toHaveBeenCalled();
  });
  it('respects the automatic sub-option before Chromium updates visibility', async () => {
    enable(false);
    const automatic = {
      action: 'enterpictureinpicture',
      enterPictureInPictureReason: 'contentoccluded',
    } as unknown as MediaSessionActionDetails;
    handler(automatic);
    await Promise.resolve();
    expect(request).not.toHaveBeenCalled();
    enable(true);
    handler(automatic);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
  });
  it('allows an explicit browser PiP action from a background tab with automatic PiP off', async () => {
    enable(false);
    hidden = true;
    handler({
      action: 'enterpictureinpicture',
      enterPictureInPictureReason: 'useraction',
    } as unknown as MediaSessionActionDetails);
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
  });
  it('keeps native PiP when off and routes YouTube video and Document PiP requests when enabled', async () => {
    await video.requestPictureInPicture();
    expect(nativeRequest).toHaveBeenCalledOnce();
    enable();
    const result = await video.requestPictureInPicture();
    expect(result.width).toBe(480);
    expect(result.height).toBe(270);
    expect(nativeRequest).toHaveBeenCalledOnce();
    const api = window as unknown as {
      documentPictureInPicture: {
        requestWindow: (options: unknown) => Promise<Window>;
      };
    };
    expect(
      await api.documentPictureInPicture.requestWindow({
        width: 640,
        height: 360,
      })
    ).toBe(pip);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('opens from browser media controls but only automatically with the sub-option enabled', async () => {
    enable();
    handler({ action: 'enterpictureinpicture' as MediaSessionAction });
    expect(request).toHaveBeenCalledOnce();
    await video.requestPictureInPicture();
    hidden = true;
    handler({ action: 'enterpictureinpicture' as MediaSessionAction });
    expect(request).toHaveBeenCalledOnce();
    enable(true);
    handler({ action: 'enterpictureinpicture' as MediaSessionAction });
    expect(request).toHaveBeenCalledTimes(2);
    Object.defineProperty(video, 'paused', { value: true });
    handler({ action: 'enterpictureinpicture' as MediaSessionAction });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it('preserves YouTube media handlers registered before and during the override', () => {
    const original = vi.fn();
    const next = vi.fn();
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture' as MediaSessionAction,
      original
    );
    enable(true);
    navigator.mediaSession.setActionHandler(
      'enterpictureinpicture' as MediaSessionAction,
      next
    );
    expect(handler).not.toBe(next);
    video.dataset.mfsPipOverride = 'false';
    document.dispatchEvent(new Event(YOUTUBE_PIP_SETTINGS_CHANGED));
    expect(handler).toBe(next);
  });
  it.each([
    null,
    {},
    { width: -1, height: 200 },
    { width: 400, height: Number.NaN },
  ])('ignores invalid saved sizes: %s', (value) => {
    expect(normalizeYouTubePipSize(value)).toEqual({ width: 360, height: 203 });
  });
});
