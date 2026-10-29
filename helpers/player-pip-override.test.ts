// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MINI_PLAYER_GEOMETRY_KEY } from './mini-player-settings';
import { FloatingPlayer } from './player-floating';
import {
  DEFAULT_PLAYER_TOOLS,
  type PlayerToolsSettings,
} from './player-tools-settings';
import { YOUTUBE_PIP_SIZE_KEY } from './youtube-pip';

let floating: FloatingPlayer;
let video: HTMLVideoElement;
let root: ShadowRoot;
let pip: Window;
let settings: PlayerToolsSettings;
let paused: boolean;
let hidden: boolean;
let requestWindow: ReturnType<typeof vi.fn>;
const save = vi.fn(async (_data: Record<string, unknown>) => {});
beforeEach(async () => {
  hidden = false;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  window.history.replaceState(null, '', '/watch?v=test');
  settings = {
    ...DEFAULT_PLAYER_TOOLS,
    miniPlayer: false,
    youtubePipOverride: true,
  };
  paused = false;
  save.mockReset();
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => ({
          [YOUTUBE_PIP_SIZE_KEY]: { width: 480, height: 270 },
        }),
        set: save,
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  });
  document.body.innerHTML =
    '<div id="movie_player"><video style="filter:brightness(120%);width:640px"></video></div><div id="tools"></div><iframe></iframe>';
  video = document.querySelector('video') as HTMLVideoElement;
  root = (document.querySelector('#tools') as HTMLElement).attachShadow({
    mode: 'open',
  });
  pip = (document.querySelector('iframe') as HTMLIFrameElement)
    .contentWindow as Window;
  Object.defineProperties(pip, {
    innerWidth: { configurable: true, value: 480 },
    innerHeight: { configurable: true, value: 270 },
  });
  vi.spyOn(pip, 'close').mockImplementation(() =>
    pip.dispatchEvent(new Event('pagehide'))
  );
  Object.defineProperties(video, {
    paused: { configurable: true, get: () => paused },
    duration: { configurable: true, value: 120 },
  });
  video.currentTime = 30;
  vi.spyOn(video, 'play').mockImplementation(async () => {
    paused = false;
    video.dispatchEvent(new Event('play'));
  });
  vi.spyOn(video, 'pause').mockImplementation(() => {
    paused = true;
    video.dispatchEvent(new Event('pause'));
  });
  requestWindow = vi.fn(async () => pip);
  vi.stubGlobal('documentPictureInPicture', { requestWindow });
  floating = new FloatingPlayer(
    video,
    root,
    () => settings,
    true,
    vi.fn(),
    vi.fn(),
    () => ({ range: null, enabled: false })
  );
  await vi.waitFor(() => expect(video.dataset.mfsPipOverride).toBe('true'));
});
afterEach(() => {
  floating.cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
const control = (label: string) => {
  const shadow = pip.document.body.firstElementChild?.shadowRoot;
  const node = shadow?.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  if (!node) throw new Error(`Missing PiP control: ${label}`);
  return node;
};
it('opens and closes immediately without requesting source-to-PiP transitions', async () => {
  video.getBoundingClientRect = () => new DOMRect(20, 100, 640, 360);
  const sendMessage = vi.fn(async (_message: { action: string }) => ({
    windowId: 2,
    rect: { left: 900, top: 600, width: 480, height: 270 },
  }));
  Object.assign(chrome, { runtime: { sendMessage } });
  await floating.openPip();
  const host = pip.document.body.firstElementChild as HTMLElement;
  expect(host.style.opacity).toBe('');
  expect(floating.inPip).toBe(true);
  control('Close Picture-in-Picture').click();
  expect(floating.inPip).toBe(false);
  expect(video.ownerDocument).toBe(document);
  expect(paused).toBe(true);
  expect(
    sendMessage.mock.calls.every(([message]) => message.action === 'register')
  ).toBe(true);
});
it('dismisses automatic PiP when the tab becomes visible and continues the same playback', async () => {
  hidden = true;
  await floating.openPip(true);
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  expect(pip.close).toHaveBeenCalledOnce();
  expect(video.parentElement?.id).toBe('movie_player');
  expect(paused).toBe(false);
  expect(video.pause).not.toHaveBeenCalled();
  expect(video.currentTime).toBe(30);
});
it.each(['tab return', 'browser return', 'Back to tab', 'Close'])(
  'preserves the latest PiP position if reattaching the video resets its clock (%s)',
  async (action) => {
    hidden = true;
    await floating.openPip(true);
    video.currentTime = 68.25;
    video.playbackRate = 1.5;
    video.volume = 0.4;
    const marker = Array.from(
      document.querySelector('#movie_player')?.childNodes ?? []
    ).find((node) => node.nodeType === Node.COMMENT_NODE) as Comment;
    const replace = marker.replaceWith.bind(marker);
    vi.spyOn(marker, 'replaceWith').mockImplementation((...nodes) => {
      replace(...nodes);
      video.currentTime = 0;
      paused = true;
    });
    const displayedTimes: number[] = [];
    video.addEventListener('timeupdate', () =>
      displayedTimes.push(video.currentTime)
    );
    if (action === 'tab return') {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    } else if (action === 'browser return') {
      pip.dispatchEvent(new Event('pagehide'));
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    } else
      control(action === 'Close' ? 'Close Picture-in-Picture' : action).click();
    await vi.waitFor(() => expect(floating.inPip).toBe(false));
    expect(video.parentElement?.id).toBe('movie_player');
    expect(video.currentTime).toBe(68.25);
    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.4);
    expect(displayedTimes).toContain(68.25);
    expect(paused).toBe(action === 'Close');
    expect(pip.document.querySelector('video')).toBeNull();
  }
);
it('handles automatic PiP closure before visibilitychange without pausing', async () => {
  hidden = true;
  await floating.openPip(true);
  pip.dispatchEvent(new Event('pagehide'));
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(paused).toBe(false);
  expect(video.pause).not.toHaveBeenCalled();
});
it('waits for the tab to actually become hidden before treating an automatic request as returned', async () => {
  await floating.openPip(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(pip.close).not.toHaveBeenCalled();
  hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  expect(pip.close).toHaveBeenCalledOnce();
  expect(paused).toBe(false);
});
it('still pauses an automatic PiP window closed manually while away', async () => {
  hidden = true;
  await floating.openPip(true);
  control('Close Picture-in-Picture').click();
  expect(paused).toBe(true);
});
it('keeps explicitly opened PiP visible when switching back to the tab', async () => {
  await floating.openPip();
  hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  expect(pip.close).not.toHaveBeenCalled();
  expect(paused).toBe(false);
});
it('does not resume a video the user paused in automatic PiP when returning to the tab', async () => {
  hidden = true;
  await floating.openPip(true);
  control('Pause').click();
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  expect(pip.close).toHaveBeenCalledOnce();
  expect(paused).toBe(true);
});
it('cancels automatic PiP still opening when the user returns to the tab', async () => {
  hidden = true;
  let resolve: (value: Window) => void = () => {};
  requestWindow.mockImplementationOnce(
    () =>
      new Promise<Window>((done) => {
        resolve = done;
      })
  );
  const pending = floating.openPip(true);
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  resolve(pip);
  await pending;
  expect(pip.close).toHaveBeenCalledOnce();
  expect(video.parentElement?.id).toBe('movie_player');
  expect(paused).toBe(false);
});
it('always uses Custom PiP when overriding, regardless of a legacy Chrome mode value', async () => {
  settings.youtubePipMode = 'chrome-video';
  floating.update();
  await floating.openPip();
  expect(requestWindow).toHaveBeenCalledOnce();
  expect(video.ownerDocument).toBe(pip.document);
  expect(video.dataset.mfsPipMode).toBe('mini-player');
});
it('does not silently replace Custom PiP with native PiP when unavailable', async () => {
  vi.stubGlobal('documentPictureInPicture', undefined);
  const native = vi.fn();
  Object.defineProperty(video, 'requestPictureInPicture', {
    configurable: true,
    value: native,
  });
  await expect(floating.openPip()).rejects.toThrow(
    'Custom Picture-in-Picture is unavailable'
  );
  expect(native).not.toHaveBeenCalled();
});
it('keeps the same Custom PiP video playing through YouTube ads', async () => {
  await floating.openPip();
  const player = document.querySelector('#movie_player');
  for (const ad of ['ad-showing', 'ad-interrupting']) {
    player?.classList.add(ad);
    floating.update();
    expect(pip.close).not.toHaveBeenCalled();
    expect(floating.inPip).toBe(true);
    expect(video.ownerDocument).toBe(pip.document);
    expect(video.currentTime).toBe(30);
    expect(video.pause).not.toHaveBeenCalled();
    player?.classList.remove(ad);
    floating.update();
  }
  expect(requestWindow).toHaveBeenCalledOnce();
});
it('fits Custom PiP to a non-scrolling viewport and pauses when its Close button is used', async () => {
  const sourceOverflow = document.documentElement.style.overflow;
  await floating.openPip();
  for (const node of [pip.document.documentElement, pip.document.body]) {
    expect(node.style.overflow).toBe('clip');
    expect(node.style.height).toBe('100%');
    expect(node.style.overscrollBehavior).toBe('none');
  }
  const host = pip.document.body.firstElementChild as HTMLElement;
  expect(host.style.position).toBe('fixed');
  expect(host.style.inset).toBe('0px');
  expect(host.style.overflow).toBe('clip');
  control('Close Picture-in-Picture').click();
  expect(floating.inPip).toBe(false);
  expect(video.ownerDocument).toBe(document);
  expect(paused).toBe(true);
  expect(video.currentTime).toBe(30);
  expect(document.documentElement.style.overflow).toBe(sourceOverflow);
});
it('pauses after the system closes Custom PiP and restores the video node', async () => {
  await floating.openPip();
  pip.dispatchEvent(new Event('pagehide'));
  expect(floating.inPip).toBe(false);
  expect(video.parentElement?.id).toBe('movie_player');
  expect(paused).toBe(true);
});
it('uses Mini Player controls and saved size with scrolling Mini Player disabled', async () => {
  await floating.openPip();
  expect(requestWindow).toHaveBeenCalledWith({
    width: 480,
    height: 270,
    preferInitialWindowPlacement: false,
  });
  expect(video.ownerDocument).toBe(pip.document);
  expect(video.style.height).toBe('100%');
  expect(video.style.aspectRatio).toBe('');
  expect(video.style.filter).toBe('brightness(120%)');
  expect(floating.inMini).toBe(false);
  control('Seek backward 5 seconds').click();
  expect(video.currentTime).toBe(25);
  control('Pause').click();
  expect(paused).toBe(true);
  control('Play').click();
  expect(paused).toBe(false);
  control('Mute').click();
  expect(video.muted).toBe(true);
  expect(
    pip.document.body.firstElementChild?.shadowRoot?.querySelector(
      '.pip-controls'
    )
  ).toBeNull();
});
it('uses headerless Chrome video PiP and lets the source button restore playback', async () => {
  settings.youtubePipOverride = false;
  let active = false;
  Object.defineProperties(document, {
    pictureInPictureEnabled: { configurable: true, value: true },
    pictureInPictureElement: {
      configurable: true,
      get: () => (active ? video : null),
    },
  });
  const nativeRequest = vi.fn(async () => {
    active = true;
    video.dispatchEvent(new Event('enterpictureinpicture'));
    return { width: 480, height: 270 };
  });
  Object.defineProperty(video, 'requestPictureInPicture', {
    configurable: true,
    value: nativeRequest,
  });
  const exit = vi.fn(async () => {
    active = false;
    video.dispatchEvent(new Event('leavepictureinpicture'));
  });
  Object.defineProperty(document, 'exitPictureInPicture', {
    configurable: true,
    value: exit,
  });
  floating.update();
  await floating.openPip();
  expect(nativeRequest).toHaveBeenCalledOnce();
  expect(requestWindow).not.toHaveBeenCalled();
  expect(floating.inPip).toBe(true);
  expect(video.parentElement?.id).toBe('movie_player');
  const player = video.parentElement;
  player?.classList.add('ad-showing');
  floating.update();
  expect(floating.inPip).toBe(true);
  expect(exit).not.toHaveBeenCalled();
  expect(paused).toBe(false);
  player?.classList.remove('ad-showing');
  (
    document.querySelector('.mfs-pip-return-button') as HTMLButtonElement
  ).click();
  await vi.waitFor(() => expect(floating.inPip).toBe(false));
  expect(exit).toHaveBeenCalledOnce();
  expect(document.querySelector('.mfs-pip-return-area')).toBeNull();
  expect(paused).toBe(false);
});
it('pauses when the native Chrome PiP window is closed', () => {
  settings.youtubePipOverride = false;
  video.dispatchEvent(new Event('enterpictureinpicture'));
  video.dispatchEvent(new Event('leavepictureinpicture'));
  expect(paused).toBe(true);
});
it('saves resized PiP without changing in-page Mini Player geometry and restores nodes on close', async () => {
  const original = video.getAttribute('style');
  await floating.openPip();
  Object.defineProperties(pip, {
    innerWidth: { value: 600 },
    innerHeight: { value: 400 },
  });
  pip.dispatchEvent(new Event('resize'));
  expect(
    control('Mini player playback controls').style.getPropertyValue(
      '--mini-scale'
    )
  ).toBe('1');
  await vi.waitFor(() =>
    expect(save).toHaveBeenCalledWith({
      [YOUTUBE_PIP_SIZE_KEY]: { width: 600, height: 400 },
    })
  );
  control('Close Picture-in-Picture').click();
  expect(floating.inPip).toBe(false);
  expect(video.parentElement?.id).toBe('movie_player');
  expect(video.getAttribute('style')).toBe(original);
  expect(root.querySelector('.mini-controls')).toBeTruthy();
  expect(
    save.mock.calls.some(([data]) => MINI_PLAYER_GEOMETRY_KEY in data)
  ).toBe(false);
  await floating.openPip();
  expect(requestWindow).toHaveBeenLastCalledWith({
    width: 600,
    height: 400,
    preferInitialWindowPlacement: false,
  });
});
it('keeps controls at the same size as a larger PiP repositions them', async () => {
  await floating.openPip();
  const controls = control('Mini player playback controls');
  expect(controls.style.getPropertyValue('--mini-scale')).toBe('1');
  Object.defineProperties(pip, {
    innerWidth: { value: 960 },
    innerHeight: { value: 540 },
  });
  pip.dispatchEvent(new Event('resize'));
  expect(controls.style.width).toBe('');
  expect(controls.style.height).toBe('');
  expect(video.style.width).toBe('100%');
  expect(video.style.height).toBe('100%');
  expect(
    (pip.document.body.firstElementChild as HTMLElement).style.getPropertyValue(
      '--mfs-pip-aspect'
    )
  ).toBe('');
  expect(controls.style.getPropertyValue('--mini-scale')).toBe('1');
});
it.each([false, true])(
  'closes immediately and pauses only for Close, including automatic PiP (%s)',
  async (automatic) => {
    hidden = automatic;
    vi.spyOn(window, 'focus').mockImplementation(() => {
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await floating.openPip(automatic);
    control('Close Picture-in-Picture').click();
    expect(pip.close).toHaveBeenCalledOnce();
    expect(video.parentElement?.id).toBe('movie_player');
    expect(video.currentTime).toBe(30);
    expect(paused).toBe(true);
    expect(floating.inPip).toBe(false);
  }
);
it('returns immediately without pausing or changing the saved window size', async () => {
  vi.spyOn(window, 'focus').mockImplementation(() => {});
  await floating.openPip();
  document.querySelector<HTMLButtonElement>('.mfs-pip-return-button')?.click();
  expect(pip.close).toHaveBeenCalledOnce();
  expect(video.parentElement?.id).toBe('movie_player');
  expect(video.currentTime).toBe(30);
  expect(paused).toBe(false);
  expect(save).toHaveBeenCalledWith({
    [YOUTUBE_PIP_SIZE_KEY]: { width: 480, height: 270 },
  });
});
it('keeps playback when Chrome closes automatic PiP while Back to tab focuses the source', async () => {
  hidden = true;
  await floating.openPip(true);
  video.currentTime = 68.25;
  vi.spyOn(window, 'focus').mockImplementation(() => {
    hidden = false;
    pip.dispatchEvent(new Event('pagehide'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  control('Back to tab').click();
  expect(floating.inPip).toBe(false);
  expect(video.parentElement?.id).toBe('movie_player');
  expect(video.currentTime).toBe(68.25);
  expect(paused).toBe(false);
  expect(video.pause).not.toHaveBeenCalled();
});
it('closes and restores the source when the override is disabled live', async () => {
  await floating.openPip();
  settings.youtubePipOverride = false;
  floating.update();
  expect(pip.close).toHaveBeenCalledOnce();
  expect(floating.inPip).toBe(false);
  expect(video.ownerDocument).toBe(document);
  expect(video.dataset.mfsPipOverride).toBe('false');
});
it('uses the empty source player to bring PiP back and removes the return area', async () => {
  await floating.openPip();
  const button = document.querySelector<HTMLButtonElement>(
    '[aria-label="Bring video back to this page"]'
  );
  expect(button?.textContent).toBe('Bring video back');
  expect(
    document.querySelector('#movie_player .mfs-pip-return-area')
  ).not.toBeNull();
  button?.click();
  expect(pip.close).toHaveBeenCalledOnce();
  expect(floating.inPip).toBe(false);
  expect(video.parentElement?.id).toBe('movie_player');
  expect(document.querySelector('.mfs-pip-return-area')).toBeNull();
  expect(paused).toBe(false);
});
it.each([true, false])(
  'anchors the return button to the full player instead of the video container (override: %s)',
  async (override) => {
    const player = video.parentElement as HTMLElement;
    const container = document.createElement('div');
    container.className = 'html5-video-container';
    player.append(container);
    container.append(video);
    settings.youtubePipOverride = override;
    if (override) await floating.openPip();
    else video.dispatchEvent(new Event('enterpictureinpicture'));
    expect(
      player.querySelector(':scope > .mfs-pip-return-area')
    ).not.toBeNull();
    expect(container.querySelector('.mfs-pip-return-area')).toBeNull();
  }
);
it('cancels pending overridden PiP when navigating away', async () => {
  let resolve: (pip: Window) => void = () => {};
  requestWindow.mockImplementationOnce(
    () =>
      new Promise<Window>((done) => {
        resolve = done;
      })
  );
  const pending = floating.openPip();
  floating.reset();
  resolve(pip);
  await pending;
  expect(pip.close).toHaveBeenCalledOnce();
  expect(video.ownerDocument).toBe(document);
  expect(root.querySelector('.mini-controls')).toBeTruthy();
});
