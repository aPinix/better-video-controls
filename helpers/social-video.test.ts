// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.instagram.com/reels/example/"}
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { ContentSettingsT } from '@/types/content';

describe('social video preferences', () => {
  let setup: typeof import('./social-video').setupSocialVideo;
  let stored: Record<string, unknown>;
  let settings: Partial<ContentSettingsT>;
  let cleanups: Array<() => void>;
  let get: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    vi.resetModules();
    ({ setupSocialVideo: setup } = await import('./social-video'));
    stored = {};
    settings = { instagramPlaybackSpeed: 1, instagramAutoSkip: false };
    cleanups = [];
    get = vi.fn((key, callback) => callback({ [key]: stored[key] }));
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get,
          set: vi.fn((value, callback) => {
            Object.assign(stored, value);
            callback?.();
          }),
        },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    });
  });
  afterEach(() => {
    cleanups.forEach((cleanup) => {
      cleanup();
    });
    document.body.replaceChildren();
    Reflect.deleteProperty(navigator, 'userActivation');
    vi.unstubAllGlobals();
  });
  function createVideo() {
    const video = document.createElement('video');
    video.loop = true;
    video.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 500,
        width: 300,
        height: 500,
      }) as DOMRect;
    Object.defineProperty(video, 'paused', {
      configurable: true,
      value: false,
    });
    document.body.append(video);
    return video;
  }
  function attach(video: HTMLVideoElement) {
    const controller = setup(video, () => settings);
    cleanups.push(controller.cleanup);
    return controller;
  }
  it('restores saved volume and mute on a new video and after a site reset', () => {
    settings.hideVideoControls = true;
    stored['mfs-instagram-audio'] = { volume: 0.3, muted: true };
    const video = createVideo();
    attach(video);
    expect(video.volume).toBe(0.3);
    expect(video.muted).toBe(true);
    video.volume = 1;
    video.dispatchEvent(new Event('play'));
    expect(video.volume).toBe(0.3);
  });
  it('shares an explicit change with subsequent videos and saves on cleanup', () => {
    const first = createVideo();
    const controller = attach(first);
    first.volume = 0.42;
    first.muted = true;
    controller.remember();
    const next = createVideo();
    attach(next);
    expect(next.volume).toBe(0.42);
    expect(next.muted).toBe(true);
    controller.cleanup();
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.42,
      muted: true,
    });
  });
  it('does not let a delayed storage read replace a newer user choice', () => {
    let resolve!: (value: unknown) => void;
    get.mockImplementation((_key, callback) => {
      resolve = callback;
    });
    const video = createVideo();
    const controller = attach(video);
    video.volume = 0.2;
    controller.remember();
    resolve({ 'mfs-instagram-audio': { volume: 0.9, muted: true } });
    expect(video.volume).toBe(0.2);
  });
  it('persists immediately and restores after a fresh content-script session', async () => {
    const first = createVideo();
    const controller = attach(first);
    controller.remember({ volume: 0.37, muted: false });
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.37,
      muted: false,
    });
    // Drop all in-memory state, as happens on a reload or browser restart.
    // No cleanup or timer flush is needed to make the preference durable.
    vi.resetModules();
    const fresh = await import('./social-video');
    const next = createVideo();
    const nextController = fresh.setupSocialVideo(next, () => settings);
    cleanups.push(nextController.cleanup);
    expect(next.volume).toBe(0.37);
    next.volume = 1;
    next.dispatchEvent(new Event('volumechange'));
    next.dispatchEvent(new Event('loadedmetadata'));
    expect(next.volume).toBe(0.37);
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.37,
      muted: false,
    });
  });
  it('does not overwrite persisted volume while the startup read is pending', () => {
    let resolve!: (value: unknown) => void;
    get.mockImplementation((_key, callback) => {
      resolve = callback;
    });
    const video = createVideo();
    attach(video);
    video.volume = 0.9;
    video.dispatchEvent(new Event('volumechange'));
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    resolve({ 'mfs-instagram-audio': { volume: 0.28, muted: false } });
    expect(video.volume).toBe(0.28);
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
  it('records an explicit control choice before applying it to the player', () => {
    settings.hideVideoControls = true;
    stored['mfs-instagram-audio'] = { volume: 0.3, muted: false };
    const video = createVideo();
    const controller = attach(video);
    controller.remember({ volume: 0.7, muted: false });
    video.volume = 0.7;
    video.dispatchEvent(new Event('volumechange'));
    expect(video.volume).toBe(0.7);
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.7,
      muted: false,
    });
  });
  it.each(['page', 'mute button'])(
    'shows the saved slider position after reload and activation via %s',
    async (activationTarget) => {
      const { OverlayCreator } = await import('./overlay-creator');
      const { SettingsManager } = await import('./settings-manager');
      const { VideoStateManager } = await import('./video-state');
      let resolve!: (value: unknown) => void;
      get.mockImplementation((_key, callback) => {
        resolve = callback;
      });
      const activation = { hasBeenActive: false };
      const previousActivation = Object.getOwnPropertyDescriptor(
        navigator,
        'userActivation'
      );
      Object.defineProperty(navigator, 'userActivation', {
        configurable: true,
        value: activation,
      });
      const manager = new SettingsManager();
      manager.updateSetting('hideVideoControls', true);
      const creator = new OverlayCreator(
        manager,
        new VideoStateManager(),
        () => {}
      );
      const methods = creator as unknown as {
        createMediaControlsElement: (doc: Document) => HTMLDivElement;
        setupMediaControls: (
          controls: HTMLDivElement,
          video: HTMLVideoElement,
          debug: boolean
        ) => { cleanup: () => void };
      };
      const video = createVideo();
      video.muted = true;
      vi.spyOn(video, 'play').mockImplementation(() =>
        video.muted
          ? Promise.resolve()
          : Promise.reject(
              new DOMException('Autoplay blocked', 'NotAllowedError')
            )
      );
      const controls = methods.createMediaControlsElement(document);
      document.body.append(controls);
      const controller = methods.setupMediaControls(controls, video, false);
      cleanups.push(controller.cleanup);
      try {
        resolve({ 'mfs-instagram-audio': { volume: 0.37, muted: false } });
        const slider = controls.querySelector<HTMLElement>('[role="slider"]');
        expect(video.volume).toBe(0.37);
        await vi.waitFor(() => expect(video.muted).toBe(true));
        await vi.waitFor(() =>
          expect(slider?.style.getPropertyValue('--mfs-volume')).toBe('37%')
        );
        expect(slider?.getAttribute('aria-valuenow')).toBe('37');
        expect(
          controls
            .querySelector('[data-mfs-action="mute"]')
            ?.getAttribute('aria-label')
        ).toBe('Unmute');
        activation.hasBeenActive = true;
        if (activationTarget === 'mute button') {
          const button = controls.querySelector<HTMLButtonElement>(
            '[data-mfs-action="mute"]'
          );
          button?.dispatchEvent(
            new MouseEvent('pointerdown', { bubbles: true })
          );
          button?.click();
        } else {
          document.dispatchEvent(
            new MouseEvent('pointerdown', { bubbles: true })
          );
        }
        expect(video.muted).toBe(false);
        expect(slider?.style.getPropertyValue('--mfs-volume')).toBe('37%');
        await vi.waitFor(() =>
          expect(
            controls
              .querySelector('[data-mfs-action="mute"]')
              ?.getAttribute('aria-label')
          ).toBe('Mute')
        );
        if (activationTarget === 'page')
          expect(chrome.storage.local.set).not.toHaveBeenCalled();
      } finally {
        if (previousActivation)
          Object.defineProperty(
            navigator,
            'userActivation',
            previousActivation
          );
        else Reflect.deleteProperty(navigator, 'userActivation');
      }
    }
  );
  it('never unmutes an offscreen video', () => {
    stored['mfs-instagram-audio'] = { volume: 0.4, muted: false };
    const video = createVideo();
    video.muted = true;
    video.getBoundingClientRect = () =>
      ({ top: -600, bottom: -100, left: 0, right: 300 }) as DOMRect;
    attach(video);
    expect(video.muted).toBe(true);
  });
  it('tries audible Instagram playback before the first interaction without saving a default', async () => {
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: false, isActive: false },
    });
    const video = createVideo();
    video.muted = true;
    const play = vi.spyOn(video, 'play').mockResolvedValue();
    attach(video);
    expect(video.muted).toBe(false);
    await vi.waitFor(() => expect(play).toHaveBeenCalledOnce());
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
  it('keeps blocked autoplay playing muted and retries only after activation', async () => {
    const activation = { hasBeenActive: false, isActive: false };
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      get: () => activation,
    });
    stored['mfs-instagram-audio'] = { volume: 0.37, muted: false };
    const video = createVideo();
    video.muted = true;
    const play = vi
      .spyOn(video, 'play')
      .mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'))
      .mockResolvedValue();
    attach(video);
    await vi.waitFor(() => expect(video.muted).toBe(true));
    expect(play).toHaveBeenCalledTimes(2);
    video.dispatchEvent(new Event('playing'));
    video.dispatchEvent(new Event('volumechange'));
    expect(play).toHaveBeenCalledTimes(2);
    // Instagram may commit its original unmute after the rejected attempt.
    Object.defineProperty(video, 'paused', { configurable: true, value: true });
    video.muted = false;
    video.dispatchEvent(new Event('volumechange'));
    expect(video.muted).toBe(true);
    expect(play).toHaveBeenCalledTimes(3);
    Object.defineProperty(video, 'paused', {
      configurable: true,
      value: false,
    });
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.37,
      muted: false,
    });
    activation.hasBeenActive = true;
    document.dispatchEvent(new Event('pointerdown'));
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(0.37);
    Reflect.deleteProperty(navigator, 'userActivation');
  });
  it('updates Instagram’s native icon when restoring audio and respects native mute choices', async () => {
    stored['mfs-instagram-audio'] = { volume: 0.37, muted: false };
    const video = createVideo();
    video.muted = true;
    const player = document.createElement('div');
    const button = document.createElement('button');
    button.innerHTML =
      '<svg aria-label="Audio is muted"><title>Audio is muted</title></svg>';
    const icon = button.querySelector('svg');
    const title = icon?.querySelector('title');
    assert.exists(icon);
    assert.exists(title);
    const click = vi.fn(() => {
      video.muted = icon.getAttribute('aria-label') !== 'Audio is muted';
      icon.setAttribute(
        'aria-label',
        video.muted ? 'Audio is muted' : 'Audio is playing'
      );
      title.textContent = icon.getAttribute('aria-label');
      video.dispatchEvent(new Event('volumechange'));
    });
    button.addEventListener('click', click);
    document.body.append(player);
    player.append(video);
    attach(video);
    // Native controls may mount after the video/content script.
    player.append(button);
    await vi.waitFor(() =>
      expect(icon.getAttribute('aria-label')).toBe('Audio is playing')
    );
    expect(video.muted).toBe(false);
    expect(video.volume).toBe(0.37);
    expect(click).toHaveBeenCalledOnce();
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    button.click();
    await vi.waitFor(() => expect(video.muted).toBe(true));
    expect(icon.getAttribute('aria-label')).toBe('Audio is muted');
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.37,
      muted: true,
    });
    expect(click).toHaveBeenCalledTimes(2);
  });
  it('does not restart a deliberately paused video or apply a late autoplay rejection after cleanup', async () => {
    const activation = { hasBeenActive: false, isActive: false };
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      get: () => activation,
    });
    const paused = createVideo();
    paused.muted = true;
    Object.defineProperty(paused, 'paused', { value: true });
    const pausedPlay = vi.spyOn(paused, 'play').mockResolvedValue();
    attach(paused);
    expect(paused.muted).toBe(true);
    expect(pausedPlay).not.toHaveBeenCalled();
    const video = createVideo();
    video.muted = true;
    let reject!: (reason: unknown) => void;
    const play = vi.spyOn(video, 'play').mockImplementation(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    );
    const controller = attach(video);
    controller.cleanup();
    reject(new DOMException('Blocked', 'NotAllowedError'));
    await Promise.resolve();
    expect(play).toHaveBeenCalledOnce();
    expect(video.muted).toBe(false);
    Reflect.deleteProperty(navigator, 'userActivation');
  });
  it('lets the first click on Instagram’s native sound button unmute exactly once', async () => {
    const activation = { hasBeenActive: false };
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: activation,
    });
    stored['mfs-instagram-audio'] = { volume: 0.37, muted: false };
    const player = document.createElement('div');
    const video = createVideo();
    video.muted = true;
    const button = document.createElement('button');
    button.innerHTML =
      '<svg aria-label="Audio is muted"><title>Audio is muted</title></svg>';
    const icon = button.querySelector('svg');
    const title = icon?.querySelector('title');
    assert.exists(icon);
    assert.exists(title);
    const click = vi.fn(() => {
      video.muted = icon.getAttribute('aria-label') !== 'Audio is muted';
      icon.setAttribute(
        'aria-label',
        video.muted ? 'Audio is muted' : 'Audio is playing'
      );
      title.textContent = icon.getAttribute('aria-label');
      video.dispatchEvent(new Event('volumechange'));
    });
    button.addEventListener('click', click);
    document.body.append(player);
    player.append(video, button);
    vi.spyOn(video, 'play')
      .mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'))
      .mockResolvedValue();
    attach(video);
    await vi.waitFor(() => expect(video.muted).toBe(true));
    const before = click.mock.calls.length;
    activation.hasBeenActive = true;
    button.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    button.click();
    await vi.waitFor(() =>
      expect(icon.getAttribute('aria-label')).toBe('Audio is playing')
    );
    expect(video.muted).toBe(false);
    expect(click).toHaveBeenCalledTimes(before + 1);
    expect(stored['mfs-instagram-audio']).toEqual({
      volume: 0.37,
      muted: false,
    });
  });
  it('respects a saved mute choice before activation and leaves players behind dialogs muted', () => {
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: false },
    });
    stored['mfs-instagram-audio'] = { volume: 0.37, muted: true };
    const video = createVideo();
    video.muted = true;
    const play = vi.spyOn(video, 'play').mockResolvedValue();
    const controller = attach(video);
    expect(video.muted).toBe(true);
    expect(play).not.toHaveBeenCalled();
    controller.remember({ volume: 0.37, muted: false });
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.getBoundingClientRect = () => new DOMRect(100, 100, 300, 300);
    document.body.append(dialog);
    video.dispatchEvent(new Event('playing'));
    expect(video.muted).toBe(true);
    expect(play).not.toHaveBeenCalled();
  });
  it('updates speed immediately and restores playback behavior on cleanup', () => {
    const video = createVideo();
    settings.instagramPlaybackSpeed = 1.5;
    settings.instagramAutoSkip = true;
    const controller = attach(video);
    expect(video.playbackRate).toBe(1.5);
    expect(video.loop).toBe(false);
    settings.instagramPlaybackSpeed = 2;
    settings.instagramAutoSkip = false;
    document.dispatchEvent(new Event('mfs-instagram-settings'));
    expect(video.playbackRate).toBe(2);
    expect(video.loop).toBe(true);
    controller.cleanup();
    expect(video.playbackRate).toBe(1);
  });
  it('skips once on ended and leaves dialogs and disabled auto-skip alone', () => {
    const video = createVideo();
    const scroller = document.createElement('div');
    scroller.style.overflowY = 'scroll';
    Object.defineProperties(scroller, {
      clientHeight: { value: 500 },
      scrollHeight: { value: 1500 },
    });
    scroller.scrollBy = vi.fn();
    document.body.append(scroller);
    scroller.append(video);
    attach(video);
    video.dispatchEvent(new Event('ended'));
    expect(scroller.scrollBy).not.toHaveBeenCalled();
    settings.instagramAutoSkip = true;
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.getBoundingClientRect = () => new DOMRect(100, 100, 300, 300);
    document.body.append(dialog);
    video.dispatchEvent(new Event('ended'));
    expect(scroller.scrollBy).not.toHaveBeenCalled();
    dialog.remove();
    video.dispatchEvent(new Event('ended'));
    video.dispatchEvent(new Event('ended'));
    expect(scroller.scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: 500,
      behavior: 'smooth',
    });
  });
});
