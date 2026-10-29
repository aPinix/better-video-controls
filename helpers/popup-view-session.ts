export const POPUP_VIEW_SESSION_KEY = 'popupViewSession';
export const POPUP_VIEW_PORT = 'popup-view-session';
export const POPUP_VIEW_TTL = 10 * 60 * 1000;

type Snapshot = Record<string, unknown>;
export interface PopupViewSession {
  lastActiveAt: number;
  snapshot: Snapshot;
}

let snapshot: Snapshot = {};
let enabled = false;
let connection: chrome.runtime.Port | undefined;

export function recentPopupView(value: unknown, now = Date.now()): Snapshot {
  const record = value as Partial<PopupViewSession> | null;
  return record &&
    typeof record.lastActiveAt === 'number' &&
    now >= record.lastActiveAt &&
    now - record.lastActiveAt < POPUP_VIEW_TTL &&
    record.snapshot &&
    typeof record.snapshot === 'object' &&
    !Array.isArray(record.snapshot)
    ? record.snapshot
    : {};
}

export async function initializePopupViewSession() {
  try {
    const stored = await chrome.storage.session.get(POPUP_VIEW_SESSION_KEY);
    snapshot = recentPopupView(stored[POPUP_VIEW_SESSION_KEY]);
    enabled = true;
    connection = chrome.runtime.connect({ name: POPUP_VIEW_PORT });
    connection.postMessage({ snapshot });
    connection.onDisconnect.addListener(() => {
      connection = undefined;
    });
    // Keep the worker connected while the popup is open so disconnect time is exact.
    setInterval(() => {
      try {
        connection?.postMessage({ touch: true });
      } catch {
        /* Popup is closing. */
      }
    }, 20_000);
  } catch {
    /* View memory is optional when session storage is unavailable. */
  }
}

export function readPopupView<T>(key: string, fallback: T): T {
  return enabled && key in snapshot ? (snapshot[key] as T) : fallback;
}

export function rememberPopupView(key: string, value: unknown) {
  if (!enabled) return;
  snapshot[key] = value;
  try {
    connection?.postMessage({ key, value });
  } catch {
    /* Popup is closing. */
  }
}

export function resetPopupLibraryView() {
  for (const key of Object.keys(snapshot)) {
    if (key.startsWith('library.')) {
      delete snapshot[key];
      try {
        connection?.postMessage({ key, remove: true });
      } catch {
        /* Popup is closing. */
      }
    }
  }
}

/** The background stamps disconnect time even when the popup closes abruptly. */
export function registerPopupViewSession() {
  chrome.runtime.onConnect.addListener((port) => {
    if (
      port.name !== POPUP_VIEW_PORT ||
      port.sender?.url !== chrome.runtime.getURL('popup.html')
    )
      return;
    let current: Snapshot = {};
    let timer: ReturnType<typeof setTimeout> | undefined;
    const persist = () => {
      clearTimeout(timer);
      void chrome.storage.session
        .set({
          [POPUP_VIEW_SESSION_KEY]: {
            lastActiveAt: Date.now(),
            snapshot: current,
          },
        })
        .catch(() => {});
    };
    port.onMessage.addListener((message) => {
      if (message.snapshot && typeof message.snapshot === 'object')
        current = { ...message.snapshot };
      else if (typeof message.key === 'string') {
        if (message.remove) delete current[message.key];
        else current[message.key] = message.value;
      }
      clearTimeout(timer);
      timer = setTimeout(persist, 80);
    });
    port.onDisconnect.addListener(persist);
  });
}
