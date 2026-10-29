import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  POPUP_VIEW_PORT,
  POPUP_VIEW_SESSION_KEY,
  POPUP_VIEW_TTL,
  recentPopupView,
  registerPopupViewSession,
} from './popup-view-session';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('popup view session', () => {
  it('keeps a recent view and expires it after ten minutes, including invalid timestamps', () => {
    const now = 2_000_000;
    const snapshot = {
      'navigation.view': 'settings',
      'settings.page': 2,
      'library.detail.scroll': 1200,
    };
    expect(
      recentPopupView({ lastActiveAt: now - POPUP_VIEW_TTL + 1, snapshot }, now)
    ).toEqual(snapshot);
    expect(
      recentPopupView({ lastActiveAt: now - POPUP_VIEW_TTL, snapshot }, now)
    ).toEqual({});
    expect(recentPopupView({ lastActiveAt: now + 1, snapshot }, now)).toEqual(
      {}
    );
    expect(recentPopupView(null, now)).toEqual({});
  });

  it('stamps the actual close time and preserves the latest position on an abrupt disconnect', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    let connect: (port: chrome.runtime.Port) => void = () => {};
    let message: (value: Record<string, unknown>) => void = () => {};
    let disconnect = () => {};
    const set = vi.fn(async (_value: unknown) => {});
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: () => 'chrome-extension://extension/popup.html',
        onConnect: {
          addListener: (callback: typeof connect) => {
            connect = callback;
          },
        },
      },
      storage: { session: { set } },
    });
    registerPopupViewSession();
    connect({
      name: POPUP_VIEW_PORT,
      sender: { url: 'chrome-extension://extension/popup.html' },
      onMessage: {
        addListener: (callback: typeof message) => {
          message = callback;
        },
      },
      onDisconnect: {
        addListener: (callback: typeof disconnect) => {
          disconnect = callback;
        },
      },
    } as unknown as chrome.runtime.Port);
    message({ snapshot: { 'settings.page': 1 } });
    vi.advanceTimersByTime(80);
    vi.advanceTimersByTime(20 * 60 * 1000);
    message({ key: 'library.overview.scroll', value: 2830 });
    disconnect();
    const record = set.mock.calls.at(-1)?.[0] as unknown as Record<
      string,
      { lastActiveAt: number; snapshot: unknown }
    >;
    expect(record[POPUP_VIEW_SESSION_KEY]).toEqual({
      lastActiveAt: Date.now(),
      snapshot: { 'settings.page': 1, 'library.overview.scroll': 2830 },
    });
    expect(
      recentPopupView(
        record[POPUP_VIEW_SESSION_KEY],
        Date.now() + POPUP_VIEW_TTL - 1
      )
    ).toEqual({ 'settings.page': 1, 'library.overview.scroll': 2830 });
  });
});
