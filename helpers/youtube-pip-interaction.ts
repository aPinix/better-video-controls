import type { PipRect } from './pip-window-geometry';
import { animateYouTubePipRect } from './youtube-pip-animation';
import {
  type PipWindowRequest,
  YOUTUBE_PIP_POSITION_KEY,
  YOUTUBE_PIP_WINDOW_MESSAGE,
} from './youtube-pip-window';

type Patch = Omit<PipWindowRequest, 'type' | 'windowId'>;
type Sample = { x: number; y: number; time: number };

export function controlYouTubePipWindow(
  pip: Window,
  surface: HTMLElement,
  report: (message: string) => void
) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage)
    return Object.assign((_save = true) => {}, {
      ready: Promise.resolve(undefined),
    });
  let disposed = false;
  let windowId: number | undefined;
  let queued: Patch | null = null;
  let running: Promise<void> | null = null;
  let dragFrame = 0;
  let resizeTimer = 0;
  let retryTimer = 0;
  let finishRetry: (() => void) | undefined;
  let registration: ReturnType<typeof register> | null = null;
  let animation = 0;
  let settling = false;
  let drag: {
    start: Sample;
    base: PipRect;
    desired: PipRect;
    pointerId: number;
    samples: Sample[];
  } | null = null;
  const nativeRect = (): PipRect => ({
    left: pip.screenX,
    top: pip.screenY,
    width: pip.outerWidth,
    height: pip.outerHeight,
  });
  const send = async (patch: Patch) => {
    if (disposed) return;
    const result = await chrome.runtime.sendMessage({
      type: YOUTUBE_PIP_WINDOW_MESSAGE,
      windowId,
      ...patch,
    });
    if (result?.error) throw new Error(result.error);
    return result as
      | { windowId: number; rect: PipRect; from?: PipRect }
      | undefined;
  };
  async function register(): ReturnType<typeof send> {
    for (let attempt = 0; !disposed; attempt += 1) {
      try {
        const result = await send({ action: 'register' });
        if (disposed) return;
        if (!result || !Number.isInteger(result.windowId))
          throw new Error('Picture-in-Picture window is not ready.');
        windowId = result.windowId;
        return result;
      } catch (error) {
        if (disposed) return;
        if (attempt === 2) throw error;
        await new Promise<void>((resolve) => {
          finishRetry = resolve;
          retryTimer = pip.setTimeout(resolve, 50 * (attempt + 1));
        });
        finishRetry = undefined;
      }
    }
  }
  const ensureRegistered = () => {
    if (!registration)
      registration = register().finally(() => {
        registration = null;
      });
    return registration;
  };
  const ready = ensureRegistered();
  const failed = (error: unknown) => {
    if (!disposed)
      report(
        error instanceof Error
          ? error.message
          : 'Could not move Picture-in-Picture.'
      );
  };
  void ready.catch(failed);
  const savePosition = (rect?: PipRect) => {
    void chrome.storage.local
      .set({
        [YOUTUBE_PIP_POSITION_KEY]: {
          x: rect?.left ?? pip.screenX,
          y: rect?.top ?? pip.screenY,
        },
      })
      .catch(failed);
  };
  const flush = async (): Promise<void> => {
    while (!disposed && (running || queued)) {
      if (!running)
        running = (async () => {
          if (windowId === undefined) await ensureRegistered();
          while (queued && !disposed) {
            const patch = queued;
            queued = null;
            await send(patch);
          }
        })().finally(() => {
          running = null;
        });
      await running;
    }
  };
  const scheduleDrag = () => {
    if (dragFrame || disposed) return;
    dragFrame = pip.requestAnimationFrame(() => {
      dragFrame = 0;
      void flush().catch(failed);
    });
  };
  const root = surface.getRootNode() as ShadowRoot;
  const style = pip.document.createElement('style');
  style.textContent =
    '[data-mfs-pip-dragging=true] { cursor:grabbing !important; }';
  root.append(style);
  const sample = (event: PointerEvent): Sample => ({
    x: event.screenX,
    y: event.screenY,
    time: event.timeStamp,
  });
  const down = (event: PointerEvent) => {
    if (disposed || !event.isTrusted || event.button !== 0) return;
    if (
      event
        .composedPath()
        .some(
          (node) =>
            (node as Element).nodeType === 1 &&
            (node as Element).matches('button,input,select,a')
        )
    )
      return;
    event.preventDefault();
    animation += 1;
    settling = false;
    const start = sample(event);
    drag = {
      start,
      base: nativeRect(),
      desired: nativeRect(),
      pointerId: event.pointerId,
      samples: [start],
    };
    surface.dataset.mfsPipDragging = 'true';
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // Document listeners can still finish the gesture during activation.
    }
  };
  const move = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = sample(event);
    drag.samples = [
      ...drag.samples.filter((point) => next.time - point.time <= 100),
      next,
    ];
    const desired = {
      ...drag.base,
      left: drag.base.left + next.x - drag.start.x,
      top: drag.base.top + next.y - drag.start.y,
    };
    drag.desired = desired;
    queued = { action: 'move', x: desired.left, y: desired.top };
    scheduleDrag();
  };
  const up = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const lastMove = drag.samples.at(-1) as Sample;
    if (
      event.type === 'pointerup' &&
      (event.screenX !== lastMove.x || event.screenY !== lastMove.y)
    )
      move(event);
    const completed = drag;
    drag = null;
    pip.cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    delete surface.dataset.mfsPipDragging;
    if (surface.hasPointerCapture(event.pointerId))
      surface.releasePointerCapture(event.pointerId);
    const first = completed.samples[0] as Sample;
    const last = completed.samples.at(-1) as Sample;
    const duration = Math.max(1, last.time - first.time);
    const vx = (last.x - first.x) / duration;
    const vy = (last.y - first.y) / duration;
    const flick =
      event.type === 'pointerup' &&
      event.timeStamp - last.time < 120 &&
      Math.hypot(vx, vy) > 0.75 &&
      Math.hypot(last.x - completed.start.x, last.y - completed.start.y) > 28;
    const generation = ++animation;
    settling = true;
    const cancelled = () => disposed || generation !== animation;
    const reducedMotion = pip.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    void flush()
      .then(async () => {
        if (cancelled()) return;
        const result = await send({
          action: 'settle',
          x: completed.desired.left,
          y: completed.desired.top,
          vx,
          vy,
          flick,
          reducedMotion,
          prepareAnimation: !reducedMotion,
        });
        if (cancelled() || !result) return;
        if (result.from && !reducedMotion) {
          const finished = await animateYouTubePipRect(
            pip,
            result.from,
            result.rect,
            (rect) =>
              send({
                action: 'animate',
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
              }),
            { cancelled }
          );
          if (!finished) return;
          return send({ action: 'settle', reducedMotion: true });
        }
        return result;
      })
      .then((result) => {
        if (!cancelled() && result) savePosition(result.rect);
      })
      .finally(() => {
        if (generation === animation) settling = false;
      })
      .catch(failed);
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.composedPath()[0] !== surface) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    animation += 1;
    settling = false;
    const step = event.shiftKey ? 1 : 10;
    const rect = nativeRect();
    queued = {
      action: 'move',
      x: rect.left + delta[0] * step,
      y: rect.top + delta[1] * step,
    };
    void flush()
      .then(() => send({ action: 'settle', reducedMotion: true }))
      .then((result) => savePosition(result?.rect))
      .catch(failed);
  };
  const resized = () => {
    pip.clearTimeout(resizeTimer);
    resizeTimer = pip.setTimeout(() => {
      if (!disposed && !drag && !queued && !running && !settling)
        savePosition();
    }, 180);
  };
  pip.document.addEventListener('pointerdown', down, true);
  pip.document.addEventListener('pointermove', move, true);
  pip.document.addEventListener('pointerup', up, true);
  pip.document.addEventListener('pointercancel', up, true);
  pip.document.addEventListener('lostpointercapture', up, true);
  root.addEventListener('keydown', keydown as EventListener);
  pip.addEventListener('resize', resized);
  const cleanup = (save = true) => {
    if (disposed) return;
    if (save) savePosition();
    disposed = true;
    animation += 1;
    pip.cancelAnimationFrame(dragFrame);
    pip.clearTimeout(resizeTimer);
    pip.clearTimeout(retryTimer);
    finishRetry?.();
    pip.document.removeEventListener('pointerdown', down, true);
    pip.document.removeEventListener('pointermove', move, true);
    pip.document.removeEventListener('pointerup', up, true);
    pip.document.removeEventListener('pointercancel', up, true);
    pip.document.removeEventListener('lostpointercapture', up, true);
    root.removeEventListener('keydown', keydown as EventListener);
    pip.removeEventListener('resize', resized);
    style.remove();
    delete surface.dataset.mfsPipDragging;
  };
  return Object.assign(cleanup, { ready });
}
