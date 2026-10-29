import {
  fitPipRect,
  interpolatePipRect,
  limitPipDrag,
  type PipDisplay,
  type PipRect,
  pipDisplayForRect,
  pipEaseOutProgress,
  pipFlickCorner,
} from './pip-window-geometry';

export const YOUTUBE_PIP_WINDOW_MESSAGE = 'MFS_YOUTUBE_PIP_WINDOW';
export const YOUTUBE_PIP_POSITION_KEY = 'youtubePipPosition';
type Position = { x: number; y: number };
export type PipWindowRequest = {
  type: typeof YOUTUBE_PIP_WINDOW_MESSAGE;
  action: 'register' | 'move' | 'resize' | 'settle' | 'animate';
  windowId?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  vx?: number;
  vy?: number;
  flick?: boolean;
  reducedMotion?: boolean;
  prepareAnimation?: boolean;
};
const animations = new Map<number, object>();
type RegisteredPipWindow = {
  sender: chrome.runtime.MessageSender;
  window: chrome.windows.Window;
  displays?: PipDisplay[];
  dragging: boolean;
  ignoreUntil: number;
  timer?: ReturnType<typeof setTimeout>;
  animationDisplays?: PipDisplay[];
};
const registeredWindows = new Map<number, RegisteredPipWindow>();

function rememberPipBounds(
  registered: RegisteredPipWindow,
  bounds: chrome.windows.Window,
  fallback?: PipRect
): void {
  const previous = registered.window;
  // Bounds events and update responses need not include populated tabs. Keep
  // the verified window identity intact and update only its native geometry.
  registered.window = {
    ...previous,
    left: bounds.left ?? fallback?.left ?? previous.left,
    top: bounds.top ?? fallback?.top ?? previous.top,
    width: bounds.width ?? fallback?.width ?? previous.width,
    height: bounds.height ?? fallback?.height ?? previous.height,
  };
}

function animationRect(request: PipWindowRequest): PipRect {
  if (
    !Number.isInteger(request.width) ||
    !Number.isInteger(request.height) ||
    (request.width as number) < 1 ||
    (request.height as number) < 1 ||
    (request.width as number) > 8192 ||
    (request.height as number) > 8192
  )
    throw new Error('Invalid PiP size.');
  const position = normalizeYouTubePipPosition({ x: request.x, y: request.y });
  if (!position) throw new Error('Invalid PiP position.');
  return {
    left: position.x,
    top: position.y,
    width: request.width as number,
    height: request.height as number,
  };
}

export function normalizeYouTubePipPosition(value: unknown): Position | null {
  const position = value as Partial<Position> | null;
  return position &&
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y)
    ? { x: Math.round(position.x), y: Math.round(position.y) }
    : null;
}

// Window mutation is limited to the real always-on-top about:blank PiP tab
// whose opener is the requesting YouTube tab. Ordinary browser windows and
// another tab's PiP window cannot be moved through this message handler.
export async function handleYouTubePipWindowRequest(
  request: PipWindowRequest,
  sender: chrome.runtime.MessageSender
): Promise<{ windowId: number; rect: PipRect; from?: PipRect }> {
  const url = new URL(sender.url ?? 'about:blank');
  if (
    sender.frameId !== 0 ||
    sender.tab?.id === undefined ||
    url.protocol !== 'https:' ||
    !/(^|\.)youtube\.com$/.test(url.hostname)
  )
    throw new Error('Invalid PiP opener.');
  const id = request.windowId;
  const cached = id === undefined ? undefined : registeredWindows.get(id);
  const sameOpener =
    cached?.sender.tab?.id === sender.tab.id &&
    cached?.sender.documentId === sender.documentId;
  // A prepared transition already verified this real PiP's opener and read the
  // displays. That identity lasts until onRemoved; don't repeat those expensive
  // native reads for every frame. Unregistered frames take the full checked path.
  if (
    id !== undefined &&
    sameOpener &&
    cached?.animationDisplays &&
    request.action === 'animate'
  ) {
    const desired = animationRect(request);
    const display = pipDisplayForRect(desired, cached.animationDisplays);
    const target = limitPipDrag(desired, display.bounds);
    cached.dragging = true;
    cached.ignoreUntil = Date.now() + 800;
    animations.delete(id);
    const updated = await chrome.windows.update(id, target);
    rememberPipBounds(cached, updated, target);
    return { windowId: id, rect: target };
  }
  const isOwnedPip = (win: chrome.windows.Window) => {
    const tab = win.tabs?.[0];
    return (
      win.alwaysOnTop &&
      win.tabs?.length === 1 &&
      tab?.url === 'about:blank' &&
      tab.openerTabId === sender.tab?.id
    );
  };
  // Registration verifies the real PiP and its opener. During direct pointer
  // manipulation reuse that identity and display snapshot, so each frame needs
  // only the window update, rather than three sequential native API calls.
  const interactive =
    sameOpener &&
    cached?.displays &&
    (request.action === 'move' || request.action === 'resize');
  const pip = interactive
    ? cached.window
    : request.action === 'register'
      ? (await chrome.windows.getAll({ populate: true })).find(isOwnedPip)
      : Number.isInteger(request.windowId)
        ? await chrome.windows.get(request.windowId as number, {
            populate: true,
          })
        : null;
  if (!pip || pip.id === undefined || !isOwnedPip(pip))
    throw new Error('Picture-in-Picture window is unavailable.');
  const displays = interactive
    ? (cached.displays as PipDisplay[])
    : (await chrome.system.display.getInfo()).filter(
        (display) => display.isEnabled && display.activeState !== 'inactive'
      );
  const current: PipRect = {
    left: pip.left ?? 0,
    top: pip.top ?? 0,
    width: pip.width ?? 360,
    height: pip.height ?? 237,
  };
  const registered: RegisteredPipWindow = registeredWindows.get(pip.id) ?? {
    sender,
    window: pip,
    dragging: false,
    ignoreUntil: 0,
  };
  registered.sender = sender;
  registered.window = pip;
  registered.displays = displays;
  registered.dragging =
    request.action === 'move' ||
    request.action === 'resize' ||
    request.action === 'animate' ||
    (request.action === 'settle' && request.prepareAnimation === true);
  registered.ignoreUntil = Date.now() + 800;
  registeredWindows.set(pip.id, registered);
  let desired = { ...current };
  const token = {};
  animations.set(pip.id, token);
  if (request.action === 'register') {
    const data = await chrome.storage.local.get(YOUTUBE_PIP_POSITION_KEY);
    const position = normalizeYouTubePipPosition(
      data[YOUTUBE_PIP_POSITION_KEY]
    );
    if (position) desired = { ...desired, left: position.x, top: position.y };
  } else if (request.action === 'move') {
    const position = normalizeYouTubePipPosition({
      x: request.x,
      y: request.y,
    });
    if (!position) throw new Error('Invalid PiP position.');
    desired = { ...desired, left: position.x, top: position.y };
  } else if (request.action === 'resize' || request.action === 'animate') {
    if (
      !Number.isInteger(request.width) ||
      !Number.isInteger(request.height) ||
      (request.width as number) < 1 ||
      (request.height as number) < 1 ||
      (request.width as number) > 8192 ||
      (request.height as number) > 8192
    )
      throw new Error('Invalid PiP size.');
    const position =
      request.x === undefined && request.y === undefined
        ? { x: desired.left, y: desired.top }
        : normalizeYouTubePipPosition({ x: request.x, y: request.y });
    if (!position) throw new Error('Invalid PiP position.');
    desired = {
      ...desired,
      width: request.width as number,
      height: request.height as number,
      left: position.x,
      top: position.y,
    };
  } else if (request.action === 'settle') {
    const position = normalizeYouTubePipPosition({
      x: request.x,
      y: request.y,
    });
    if (position) desired = { ...desired, left: position.x, top: position.y };
  } else throw new Error('Invalid PiP action.');
  const display = pipDisplayForRect(desired, displays);
  let target = fitPipRect(desired, display.workArea);
  if (request.action === 'animate')
    target = limitPipDrag(desired, display.bounds);
  if (request.action === 'move') target = limitPipDrag(desired, display.bounds);
  if (
    request.action === 'settle' &&
    request.flick &&
    Number.isFinite(request.vx) &&
    Number.isFinite(request.vy)
  )
    target = pipFlickCorner(
      target,
      display.workArea,
      request.vx as number,
      request.vy as number
    );
  if (request.action === 'settle' && request.prepareAnimation) {
    registered.animationDisplays = displays;
    return { windowId: pip.id, from: current, rect: target };
  }
  if (request.action === 'settle') delete registered.animationDisplays;
  if (
    request.action === 'settle' &&
    !request.reducedMotion &&
    Object.keys(current).some(
      (key) => current[key as keyof PipRect] !== target[key as keyof PipRect]
    )
  ) {
    const start = Date.now();
    while (animations.get(pip.id) === token && Date.now() - start < 320) {
      const rect = limitPipDrag(
        interpolatePipRect(
          current,
          target,
          pipEaseOutProgress(Date.now() - start)
        ),
        display.bounds
      );
      await chrome.windows.update(pip.id, rect);
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
    if (animations.get(pip.id) !== token)
      return { windowId: pip.id, rect: current };
  }
  const updated = await chrome.windows.update(
    pip.id,
    request.action === 'move' ? { left: target.left, top: target.top } : target
  );
  rememberPipBounds(registered, updated, target);
  if (animations.get(pip.id) === token) animations.delete(pip.id);
  return { windowId: pip.id, rect: target };
}

export function registerYouTubePipWindowBackground(): void {
  chrome.system.display.onDisplayChanged?.addListener(() => {
    for (const registered of registeredWindows.values()) {
      delete registered.displays;
      delete registered.animationDisplays;
    }
  });
  chrome.windows.onRemoved.addListener((id) => {
    clearTimeout(registeredWindows.get(id)?.timer);
    registeredWindows.delete(id);
    animations.delete(id);
  });
  // Native title-bar moves don't emit DOM pointer events. Apply the same
  // release boundary and persistence after the OS finishes moving the window.
  chrome.windows.onBoundsChanged.addListener((win) => {
    if (win.id === undefined) return;
    const id = win.id;
    const registered = registeredWindows.get(id);
    if (registered) rememberPipBounds(registered, win);
    if (!registered || registered.dragging || animations.has(id)) return;
    clearTimeout(registered.timer);
    const settle = () => {
      if (registered.dragging || animations.has(id)) return;
      if (Date.now() < registered.ignoreUntil) {
        registered.timer = setTimeout(
          settle,
          registered.ignoreUntil - Date.now() + 180
        );
        return;
      }
      void handleYouTubePipWindowRequest(
        {
          type: YOUTUBE_PIP_WINDOW_MESSAGE,
          action: 'settle',
          windowId: id,
        },
        registered.sender
      )
        .then(({ rect }) =>
          chrome.storage.local.set({
            [YOUTUBE_PIP_POSITION_KEY]: { x: rect.left, y: rect.top },
          })
        )
        .catch(() => {});
    };
    registered.timer = setTimeout(settle, 180);
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== YOUTUBE_PIP_WINDOW_MESSAGE) return;
    void handleYouTubePipWindowRequest(message, sender).then(respond, () =>
      respond({ error: 'Could not control the Picture-in-Picture window.' })
    );
    return true;
  });
}
