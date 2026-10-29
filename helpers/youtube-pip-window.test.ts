import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  handleYouTubePipWindowRequest,
  normalizeYouTubePipPosition,
  registerYouTubePipWindowBackground,
  YOUTUBE_PIP_POSITION_KEY,
  YOUTUBE_PIP_WINDOW_MESSAGE,
} from './youtube-pip-window';

const update = vi.fn(async (id: number, rect: chrome.windows.UpdateInfo) => {
  const win = windows.find((candidate) => candidate.id === id);
  Object.assign(win ?? {}, rect);
  return win;
});
let windows: chrome.windows.Window[];
const sender = {
  frameId: 0,
  url: 'https://www.youtube.com/watch?v=test',
  tab: { id: 10, windowId: 1 },
} as chrome.runtime.MessageSender;
beforeEach(() => {
  update.mockReset();
  windows = [
    {
      id: 1,
      left: 100,
      top: 50,
      width: 1200,
      height: 800,
      alwaysOnTop: false,
      focused: true,
      incognito: false,
      tabs: [{ id: 10, url: sender.url }],
    },
    {
      id: 2,
      left: 100,
      top: 100,
      width: 360,
      height: 203,
      alwaysOnTop: true,
      focused: false,
      incognito: false,
      tabs: [{ id: 11, url: 'about:blank', openerTabId: 10 }],
    },
    {
      id: 3,
      alwaysOnTop: true,
      focused: false,
      incognito: false,
      tabs: [{ id: 12, url: 'about:blank', openerTabId: 20 }],
    },
  ] as chrome.windows.Window[];
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async () => ({ [YOUTUBE_PIP_POSITION_KEY]: { x: -1200, y: 300 } }),
      },
    },
    windows: {
      getAll: async () => windows,
      get: async (id: number) => windows.find((win) => win.id === id),
      update,
      onRemoved: { addListener: vi.fn() },
      onBoundsChanged: { addListener: vi.fn() },
    },
    runtime: { onMessage: { addListener: vi.fn() } },
    tabs: { getZoom: async () => 1 },
    system: {
      display: {
        onDisplayChanged: { addListener: vi.fn() },
        getInfo: async () => [
          {
            isEnabled: true,
            bounds: { left: -1920, top: 0, width: 1920, height: 1080 },
            workArea: { left: -1920, top: 25, width: 1920, height: 995 },
          },
          {
            isEnabled: true,
            bounds: { left: 0, top: 0, width: 1920, height: 1080 },
            workArea: { left: 0, top: 25, width: 1920, height: 995 },
          },
        ],
      },
    },
  });
  registerYouTubePipWindowBackground();
});
afterEach(() => {
  for (const [removed] of vi.mocked(chrome.windows.onRemoved.addListener).mock
    .calls)
    for (const id of [1, 2, 3]) removed(id);
  vi.unstubAllGlobals();
});
it('restores saved multi-monitor coordinates only on the requesting tab’s PiP', async () => {
  expect(
    await handleYouTubePipWindowRequest(
      { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
      sender
    )
  ).toEqual({
    windowId: 2,
    rect: { left: -1200, top: 300, width: 360, height: 203 },
  });
  expect(update).toHaveBeenCalledWith(2, {
    left: -1200,
    top: 300,
    width: 360,
    height: 203,
  });
});
it('moves and resizes an owned PiP window', async () => {
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'move',
      windowId: 2,
      x: 640,
      y: 280,
    },
    sender
  );
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'resize',
      windowId: 2,
      width: 480,
      height: 304,
    },
    sender
  );
  expect(update).toHaveBeenCalledWith(2, {
    left: 640,
    top: 280,
  });
  expect(update).toHaveBeenCalledWith(2, {
    left: 640,
    top: 280,
    width: 480,
    height: 304,
  });
});
it.each([1, 3, 999])(
  'rejects unrelated or missing windows: %s',
  async (windowId) => {
    await expect(
      handleYouTubePipWindowRequest(
        {
          type: YOUTUBE_PIP_WINDOW_MESSAGE,
          action: 'move',
          windowId,
          x: 100,
          y: 100,
        },
        sender
      )
    ).rejects.toThrow('unavailable');
    expect(update).not.toHaveBeenCalled();
  }
);
it.each([
  { ...sender, frameId: 1 },
  { ...sender, url: 'https://youtube.com.evil.example/watch' },
  { ...sender, url: 'https://example.com' },
])('rejects messages outside the top-level YouTube opener', async (source) => {
  await expect(
    handleYouTubePipWindowRequest(
      { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
      source
    )
  ).rejects.toThrow('Invalid PiP opener');
});
it('recovers a saved position after its monitor is disconnected', async () => {
  chrome.system.display.getInfo = vi.fn(async () => [
    {
      isEnabled: true,
      bounds: { left: 0, top: 0, width: 1920, height: 1080 },
      workArea: { left: 0, top: 25, width: 1920, height: 995 },
    },
  ]) as unknown as typeof chrome.system.display.getInfo;
  expect(
    await handleYouTubePipWindowRequest(
      { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
      sender
    )
  ).toEqual({
    windowId: 2,
    rect: { left: 10, top: 300, width: 360, height: 203 },
  });
});
it('allows temporary edge overshoot but lands 10px inside the usable screen on release', async () => {
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'move',
      windowId: 2,
      x: 1900,
      y: 1100,
    },
    sender
  );
  expect(update).toHaveBeenLastCalledWith(2, {
    left: 1650,
    top: 928,
  });
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'settle',
      windowId: 2,
      x: 1900,
      y: 1100,
      reducedMotion: true,
    },
    sender
  );
  expect(update).toHaveBeenLastCalledWith(2, {
    left: 1550,
    top: 807,
    width: 360,
    height: 203,
  });
});
it('sends a directional flick to a corner and includes browser frame height', async () => {
  Object.assign(windows[1] ?? {}, { height: 237 });
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'settle',
      windowId: 2,
      vx: -2,
      vy: 1,
      flick: true,
      reducedMotion: true,
    },
    sender
  );
  expect(update).toHaveBeenLastCalledWith(2, {
    left: 10,
    top: 773,
    width: 360,
    height: 237,
  });
});
it('rejects corrupt geometry and preserves negative screen coordinates', () => {
  expect(normalizeYouTubePipPosition({ x: Number.NaN, y: 0 })).toBeNull();
  expect(normalizeYouTubePipPosition({ x: -1200, y: 300.2 })).toEqual({
    x: -1200,
    y: 300,
  });
});
it('prepares a flick without blocking on worker timers, then accepts immediate animation frames', async () => {
  const prepared = await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'settle',
      windowId: 2,
      vx: 2,
      vy: 1,
      flick: true,
      prepareAnimation: true,
    },
    sender
  );
  expect(prepared.from).toEqual({
    left: 100,
    top: 100,
    width: 360,
    height: 203,
  });
  expect(prepared.rect).toEqual({
    left: 1550,
    top: 807,
    width: 360,
    height: 203,
  });
  expect(update).not.toHaveBeenCalled();
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'animate',
      windowId: 2,
      x: 800,
      y: 600,
      width: 360,
      height: 203,
    },
    sender
  );
  expect(update).toHaveBeenLastCalledWith(2, {
    left: 800,
    top: 600,
    width: 360,
    height: 203,
  });
});
it('uses the prepared display snapshot for frames and still rejects another opener', async () => {
  const get = vi.spyOn(chrome.windows, 'get');
  const display = vi.spyOn(chrome.system.display, 'getInfo');
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'settle',
      windowId: 2,
      prepareAnimation: true,
    },
    sender
  );
  get.mockClear();
  display.mockClear();
  const frame = {
    type: YOUTUBE_PIP_WINDOW_MESSAGE,
    action: 'animate',
    windowId: 2,
    x: 800,
    y: 500,
    width: 360,
    height: 203,
  } as const;
  await handleYouTubePipWindowRequest(frame, sender);
  await handleYouTubePipWindowRequest({ ...frame, x: 900 }, sender);
  expect(get).not.toHaveBeenCalled();
  expect(display).not.toHaveBeenCalled();
  await expect(
    handleYouTubePipWindowRequest(frame, {
      ...sender,
      tab: { id: 20, windowId: 1 } as chrome.tabs.Tab,
    })
  ).rejects.toThrow('unavailable');
});
it('uses only one native window update per drag or resize frame after registration', async () => {
  const get = vi.spyOn(chrome.windows, 'get');
  const displays = vi.spyOn(chrome.system.display, 'getInfo');
  await handleYouTubePipWindowRequest(
    { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
    sender
  );
  get.mockClear();
  displays.mockClear();
  update.mockClear();
  for (const x of [700, 720, 740])
    await handleYouTubePipWindowRequest(
      {
        type: YOUTUBE_PIP_WINDOW_MESSAGE,
        action: 'move',
        windowId: 2,
        x,
        y: 300,
      },
      sender
    );
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'resize',
      windowId: 2,
      x: 740,
      y: 300,
      width: 480,
      height: 300,
    },
    sender
  );
  expect(get).not.toHaveBeenCalled();
  expect(displays).not.toHaveBeenCalled();
  expect(update).toHaveBeenCalledTimes(4);
  expect(update.mock.calls[0]?.[1]).toEqual({ left: 700, top: 300 });
  expect(update.mock.calls.at(-1)?.[1]).toEqual({
    left: 740,
    top: 300,
    width: 480,
    height: 300,
  });
  await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'settle',
      windowId: 2,
      reducedMotion: true,
    },
    sender
  );
  expect(get).toHaveBeenCalledOnce();
  expect(displays).toHaveBeenCalledOnce();
});
it('revalidates cached controls when monitors change or the window closes', async () => {
  const get = vi.spyOn(chrome.windows, 'get');
  const displays = vi.spyOn(chrome.system.display, 'getInfo');
  await handleYouTubePipWindowRequest(
    { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
    sender
  );
  get.mockClear();
  displays.mockClear();
  vi.mocked(
    chrome.system.display.onDisplayChanged.addListener
  ).mock.calls[0]?.[0]();
  const move = {
    type: YOUTUBE_PIP_WINDOW_MESSAGE,
    action: 'move',
    windowId: 2,
    x: 700,
    y: 300,
  } as const;
  await handleYouTubePipWindowRequest(move, sender);
  expect(get).toHaveBeenCalledOnce();
  expect(displays).toHaveBeenCalledOnce();
  vi.mocked(chrome.windows.onRemoved.addListener).mock.calls[0]?.[0](2);
  windows = windows.filter((win) => win.id !== 2);
  await expect(handleYouTubePipWindowRequest(move, sender)).rejects.toThrow(
    'unavailable'
  );
});
it('retains verified ownership when a native update omits window metadata', async () => {
  await handleYouTubePipWindowRequest(
    { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
    sender
  );
  update.mockImplementationOnce(
    async (_id, rect) =>
      ({
        id: 2,
        left: rect.left,
        top: rect.top,
        tabs: undefined,
      }) as chrome.windows.Window
  );
  for (const x of [700, 720])
    await expect(
      handleYouTubePipWindowRequest(
        {
          type: YOUTUBE_PIP_WINDOW_MESSAGE,
          action: 'move',
          windowId: 2,
          x,
          y: 300,
        },
        sender
      )
    ).resolves.toMatchObject({ windowId: 2, rect: { left: x, top: 300 } });
});
it('uses current native window size after title-bar movement or native resizing', async () => {
  await handleYouTubePipWindowRequest(
    { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
    sender
  );
  const native = {
    id: 2,
    left: 300,
    top: 200,
    width: 480,
    height: 304,
  } as chrome.windows.Window;
  Object.assign(windows[1] ?? {}, native);
  vi.mocked(chrome.windows.onBoundsChanged.addListener).mock.calls[0]?.[0](
    native
  );
  const result = await handleYouTubePipWindowRequest(
    {
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      action: 'move',
      windowId: 2,
      x: 700,
      y: 250,
    },
    sender
  );
  expect(result.rect).toEqual({ left: 700, top: 250, width: 480, height: 304 });
});
it('keeps cached window ownership scoped to its original YouTube opener', async () => {
  await handleYouTubePipWindowRequest(
    { type: YOUTUBE_PIP_WINDOW_MESSAGE, action: 'register' },
    sender
  );
  update.mockClear();
  await expect(
    handleYouTubePipWindowRequest(
      {
        type: YOUTUBE_PIP_WINDOW_MESSAGE,
        action: 'move',
        windowId: 2,
        x: 700,
        y: 300,
      },
      {
        ...sender,
        tab: { ...sender.tab, id: 20 },
      } as chrome.runtime.MessageSender
    )
  ).rejects.toThrow('unavailable');
  expect(update).not.toHaveBeenCalled();
});
