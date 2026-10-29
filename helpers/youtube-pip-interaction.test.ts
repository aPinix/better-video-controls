// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PipRect } from './pip-window-geometry';
import { controlYouTubePipWindow } from './youtube-pip-interaction';
import type { PipWindowRequest } from './youtube-pip-window';

let release: ReturnType<typeof controlYouTubePipWindow>;
let root: ShadowRoot;
let surface: HTMLElement;
const report = vi.fn();
let current: PipRect;
const send = vi.fn();
const pointerListeners = new Map<string, EventListener>();
beforeEach(async () => {
  pointerListeners.clear();
  const listen = document.addEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation(
    (type, listener, options) => {
      if (type.includes('pointer') && typeof listener === 'function')
        pointerListeners.set(type, listener);
      listen(type, listener, options);
    }
  );
  vi.useFakeTimers();
  current = { left: 400, top: 300, width: 360, height: 237 };
  for (const [property, field] of Object.entries({
    screenX: 'left',
    screenY: 'top',
    outerWidth: 'width',
    outerHeight: 'height',
  }))
    vi.spyOn(window, property as 'screenX', 'get').mockImplementation(
      () => current[field as keyof PipRect]
    );
  vi.spyOn(window, 'innerWidth', 'get').mockImplementation(() => current.width);
  vi.spyOn(window, 'innerHeight', 'get').mockImplementation(
    () => current.height - 34
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(16), 16)
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  send.mockReset().mockImplementation(async (message: PipWindowRequest) => {
    if (message.action === 'resize' || message.action === 'move')
      current = {
        left: message.x ?? current.left,
        top: message.y ?? current.top,
        width: message.width ?? current.width,
        height: message.height ?? current.height,
      };
    return { windowId: 7, rect: { ...current } };
  });
  vi.stubGlobal('chrome', {
    runtime: { sendMessage: send },
    storage: { local: { set: vi.fn(async () => {}) } },
  });
  const host = document.createElement('div');
  document.body.append(host);
  root = host.attachShadow({ mode: 'open' });
  surface = document.createElement('div');
  surface.setPointerCapture = vi.fn();
  surface.hasPointerCapture = () => true;
  surface.releasePointerCapture = vi.fn();
  root.append(surface);
  report.mockReset();
  release = controlYouTubePipWindow(window, surface, report);
  await vi.advanceTimersByTimeAsync(0);
});
const pointer = (
  type: string,
  x: number,
  y: number,
  time: number,
  target: Element = surface
) =>
  pointerListeners.get(type)?.({
    type,
    isTrusted: true,
    button: 0,
    pointerId: 1,
    screenX: x,
    screenY: y,
    timeStamp: time,
    preventDefault: vi.fn(),
    composedPath: () => [target, root],
  } as unknown as PointerEvent);
afterEach(() => {
  release?.();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});
it('lets native resizing keep any window proportions without resize corrections', async () => {
  current = { ...current, width: 500, height: 300 };
  window.dispatchEvent(new Event('resize'));
  await vi.advanceTimersByTimeAsync(200);
  expect(current.width).toBe(500);
  expect(current.height).toBe(300);
  expect(send.mock.calls.map(([message]) => message.action)).toEqual([
    'register',
  ]);
  expect(root.querySelector('.mfs-pip-resize')).toBeNull();
});
it('moves the focused drag surface with the keyboard', async () => {
  surface.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(current.left).toBe(410);
  expect(current.top).toBe(300);
});
it('coalesces pointer movement to the latest position on each visible PiP frame', async () => {
  pointer('pointerdown', 100, 100, 0);
  for (let index = 1; index <= 20; index += 1)
    pointer('pointermove', 100 + index, 100 + index * 2, index);
  expect(
    send.mock.calls.filter(([message]) => message.action === 'move')
  ).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(16);
  const moves = send.mock.calls.filter(
    ([message]) => message.action === 'move'
  );
  expect(moves).toHaveLength(1);
  expect(moves[0]?.[0]).toMatchObject({ x: 420, y: 340 });
  pointer('pointerup', 120, 140, 160);
  await vi.advanceTimersByTimeAsync(0);
  expect(send.mock.calls.at(-1)?.[0]).toMatchObject({
    action: 'settle',
    flick: false,
  });
});
it('keeps only the latest pending drag and finishes it before settling when native updates are slow', async () => {
  const respond = send.getMockImplementation();
  let finishMove: () => void = () => {};
  let first = true;
  send.mockImplementation(async (message: PipWindowRequest) => {
    if (message.action === 'move' && first) {
      first = false;
      await new Promise<void>((resolve) => {
        finishMove = resolve;
      });
    }
    return respond?.(message);
  });
  pointer('pointerdown', 100, 100, 0);
  pointer('pointermove', 120, 120, 20);
  await vi.advanceTimersByTimeAsync(16);
  pointer('pointermove', 180, 180, 40);
  await vi.advanceTimersByTimeAsync(16);
  pointer('pointermove', 200, 200, 60);
  pointer('pointerup', 210, 210, 180);
  expect(
    send.mock.calls.filter(([message]) => message.action === 'move')
  ).toHaveLength(1);
  finishMove();
  await vi.advanceTimersByTimeAsync(0);
  expect(send.mock.calls.slice(1).map(([message]) => message.action)).toEqual([
    'move',
    'move',
    'settle',
  ]);
  expect(current.left).toBe(510);
  expect(current.top).toBe(410);
});
it('retries initial registration while retaining a drag that started before Chrome exposed the window', async () => {
  release(false);
  const respond = send.getMockImplementation();
  send.mockClear();
  let attempts = 0;
  send.mockImplementation(async (message: PipWindowRequest) => {
    if (message.action === 'register' && ++attempts < 3)
      return { error: 'Picture-in-Picture window is unavailable.' };
    return respond?.(message);
  });
  release = controlYouTubePipWindow(window, surface, report);
  pointer('pointerdown', 100, 100, 0);
  pointer('pointermove', 150, 160, 30);
  await vi.advanceTimersByTimeAsync(150);
  await release.ready;
  expect(attempts).toBe(3);
  expect(current.left).toBe(450);
  expect(current.top).toBe(360);
  expect(report).not.toHaveBeenCalled();
  pointer('pointerup', 150, 160, 200);
  await vi.advanceTimersByTimeAsync(0);
});
it('recovers on a later drag after registration initially failed', async () => {
  release(false);
  const respond = send.getMockImplementation();
  let attempts = 0;
  send.mockImplementation(async (message: PipWindowRequest) => {
    if (message.action === 'register' && ++attempts <= 3)
      return { error: 'Picture-in-Picture window is unavailable.' };
    return respond?.(message);
  });
  release = controlYouTubePipWindow(window, surface, report);
  await vi.advanceTimersByTimeAsync(150);
  expect(report).toHaveBeenCalledOnce();
  pointer('pointerdown', 100, 100, 200);
  pointer('pointermove', 160, 170, 230);
  await vi.advanceTimersByTimeAsync(16);
  expect(attempts).toBe(4);
  expect(current.left).toBe(460);
  expect(current.top).toBe(370);
  pointer('pointerup', 160, 170, 400);
  await vi.advanceTimersByTimeAsync(0);
});
it.each([
  [-100, -80],
  [100, -80],
  [-100, 80],
  [100, 80],
])('keeps directional flicks responsive (%s, %s)', async (dx, dy) => {
  pointer('pointerdown', 200, 200, 0);
  pointer('pointermove', 200 + dx, 200 + dy, 40);
  pointer('pointerup', 200 + dx, 200 + dy, 50);
  await vi.advanceTimersByTimeAsync(0);
  expect(send.mock.calls.at(-1)?.[0]).toMatchObject({
    action: 'settle',
    flick: true,
    vx: dx / 40,
    vy: dy / 40,
  });
});
it('finishes a drag when pointer capture is lost and never flicks on cancellation', async () => {
  pointer('pointerdown', 100, 100, 0);
  pointer('pointermove', 200, 180, 40);
  pointer('lostpointercapture', 200, 180, 50);
  await vi.advanceTimersByTimeAsync(0);
  expect(surface.dataset.mfsPipDragging).toBeUndefined();
  expect(send.mock.calls.at(-1)?.[0]).toMatchObject({
    action: 'settle',
    flick: false,
  });
});
it('cancels registration retries and queued movement when the window closes', async () => {
  release(false);
  send.mockImplementation(async () => ({ error: 'Not ready' }));
  release = controlYouTubePipWindow(window, surface, report);
  pointer('pointerdown', 100, 100, 0);
  pointer('pointermove', 200, 180, 40);
  await vi.advanceTimersByTimeAsync(0);
  const calls = send.mock.calls.length;
  release(false);
  await vi.advanceTimersByTimeAsync(500);
  expect(send).toHaveBeenCalledTimes(calls);
  expect(report).not.toHaveBeenCalled();
});
