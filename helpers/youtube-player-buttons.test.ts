// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type YouTubePlayerButtonState,
  YouTubePlayerButtons,
} from './youtube-player-buttons';

let buttons: YouTubePlayerButtons;
const actions = {
  onLoop: vi.fn(),
  onEdit: vi.fn(),
  onBoost: vi.fn(),
  onCinema: vi.fn(),
  onInfoCards: vi.fn(),
  onScreenshot: vi.fn(),
  onFilters: vi.fn(),
  onPip: vi.fn(),
  onBookmarks: vi.fn(),
  onEditBookmarks: vi.fn(),
  onAdvanced: vi.fn(),
  onCollapse: vi.fn(),
};
const state = (): YouTubePlayerButtonState => ({
  boost: { level: 2, active: false, available: true },
  cinema: { enabled: true, active: false, available: true },
  loop: {
    enabled: true,
    active: false,
    available: true,
    expanded: false,
    hasSections: true,
  },
  infoCards: { enabled: true, visible: true, available: true },
  screenshot: { enabled: true, available: true },
  filters: { enabled: true, available: true, expanded: false },
  pip: { enabled: true, available: true },
  bookmarks: { enabled: true, available: true, expanded: false },
});
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video"></video><div class="ytp-right-controls"><span><button class="ytp-autonav-toggle-button"></button></span><button class="ytp-subtitles-button"></button></div></div>';
  buttons = new YouTubePlayerButtons(
    document.querySelector('video') as HTMLVideoElement,
    actions
  );
});
afterEach(() => {
  buttons.cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('YouTube toolbar ownership', () => {
  it('keeps the layout wrappers transparent when native player rules add their own pill background', () => {
    const nativeStyle = document.createElement('style');
    nativeStyle.textContent =
      '.html5-video-player .ytp-right-controls > span{background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px white;border:1px solid white}';
    document.head.append(nativeStyle);
    document
      .querySelector('#movie_player')
      ?.classList.add('html5-video-player');
    try {
      buttons.update(state());
      const style = getComputedStyle(buttons.toolbar);
      expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.boxShadow).toBe('none');
      const background = buttons.toolbar.querySelector(
        '.mfs-toolbar-background'
      ) as HTMLElement;
      expect(getComputedStyle(background).backgroundColor).toBe(
        'rgba(0, 0, 0, 0.45)'
      );
      buttons.collapseButton.click();
      buttons.collapseButton.click();
      expect(getComputedStyle(buttons.toolbar).backgroundColor).toBe(
        'rgba(0, 0, 0, 0)'
      );
    } finally {
      nativeStyle.remove();
    }
  });

  it('collapses only custom actions, preserves their state and restores focus to the chevron', () => {
    buttons.update(state());
    buttons.loopButton.focus();
    buttons.collapseButton.click();
    expect(document.activeElement).toBe(buttons.collapseButton);
    expect(buttons.collapseButton.getAttribute('aria-expanded')).toBe('false');
    expect(buttons.collapseButton.getAttribute('aria-label')).toBe(
      'Expand custom actions'
    );
    expect(actions.onCollapse).toHaveBeenCalledOnce();
    expect(buttons.container.hidden).toBe(true);
    expect(buttons.container.inert).toBe(true);
    expect(document.querySelector('.ytp-subtitles-button')?.isConnected).toBe(
      true
    );
    const next = state();
    next.loop.active = true;
    next.screenshot.enabled = false;
    buttons.update(next);
    expect(buttons.container.hidden).toBe(true);
    expect(buttons.loopButton.getAttribute('aria-pressed')).toBe('true');
    buttons.collapseButton.click();
    expect(buttons.collapseButton.getAttribute('aria-expanded')).toBe('true');
    expect(buttons.container.hidden).toBe(false);
    expect(buttons.container.inert).toBe(false);
    expect(buttons.screenshotButton.isConnected).toBe(false);
    buttons.loopButton.click();
    expect(actions.onLoop).toHaveBeenCalledOnce();
  });

  it('tucks the collapsed chevron into the native pill and restores the crowded row on expansion', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    controls.innerHTML =
      '<div class="ytp-right-controls-left"><button class="ytp-subtitles-button" style="width:48px"></button><button class="ytp-settings-button" style="width:48px"></button></div>';
    const pill = controls.firstElementChild;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.append(controls);
    Object.defineProperty(chrome, 'clientWidth', { value: 300 });
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    buttons.collapseButton.click();
    expect(buttons.toolbar.parentElement).toBe(pill);
    expect(pill?.firstElementChild).toBe(buttons.toolbar);
    expect(buttons.toolbar.dataset.stacked).toBe('false');
    expect(buttons.toolbar.style.width).toBe('');
    buttons.update(state());
    expect(buttons.toolbar.parentElement).toBe(pill);
    buttons.collapseButton.click();
    expect(buttons.toolbar.parentElement).toBe(controls);
    expect(buttons.toolbar.nextElementSibling).toBe(pill);
    expect(buttons.toolbar.dataset.stacked).toBe('true');
  });

  it('allows a pointer collapse to be reversed and cancels pending folding work on cleanup', async () => {
    vi.useFakeTimers();
    buttons.update(state());
    const surface = buttons.toolbar.querySelector(
      '.mfs-youtube-actions'
    ) as HTMLElement;
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(surface, 'animate', { value: animate });
    const click = () =>
      buttons.collapseButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 })
      );
    click();
    expect(animate).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          transform: expect.stringContaining('translate('),
        }),
        expect.objectContaining({
          transform: expect.stringContaining('translate('),
        }),
      ],
      expect.objectContaining({ duration: 400 })
    );
    expect(buttons.container.inert).toBe(true);
    expect(buttons.container.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(80);
    buttons.update(state());
    expect(buttons.container.hidden).toBe(false);
    click();
    await vi.advanceTimersByTimeAsync(200);
    expect(buttons.container.hidden).toBe(false);
    expect(buttons.container.inert).toBe(false);
    const next = state();
    next.screenshot.enabled = false;
    buttons.update(next);
    click();
    buttons.update(state());
    await vi.advanceTimersByTimeAsync(220);
    expect(buttons.container.hidden).toBe(true);
    expect(buttons.screenshotButton.parentElement?.hidden).toBe(true);
    buttons.expand();
    expect(buttons.container.hidden).toBe(false);
    click();
    buttons.cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([300, 1000])(
    'animates the chevron into its pill without moving the surface layout early at width %s',
    async (width) => {
      vi.useFakeTimers();
      const controls = document.querySelector(
        '.ytp-right-controls'
      ) as HTMLElement;
      controls.innerHTML =
        '<div class="ytp-right-controls-left"><button class="ytp-subtitles-button" style="width:48px"></button></div>';
      const pill = controls.firstElementChild;
      const chrome = document.createElement('div');
      chrome.className = 'ytp-chrome-bottom';
      controls.before(chrome);
      chrome.append(controls);
      Object.defineProperty(chrome, 'clientWidth', { value: width });
      buttons.update(state());
      const stacked = buttons.toolbar.dataset.stacked;
      const surface = buttons.toolbar.querySelector(
        '.mfs-youtube-actions'
      ) as HTMLElement;
      const chevron = buttons.collapseButton.parentElement as HTMLElement;
      const background = buttons.toolbar.querySelector(
        '.mfs-toolbar-background'
      ) as HTMLElement;
      const cancel = vi.fn();
      const surfaceAnimate = vi.fn(() => ({ cancel }));
      const chevronAnimate = vi.fn(() => ({ cancel }));
      const backgroundAnimate = vi.fn(() => ({ cancel }));
      const shellAnimate = vi.fn(() => ({ cancel }));
      Object.defineProperty(buttons.toolbar, 'animate', {
        value: shellAnimate,
      });
      Object.defineProperty(surface, 'animate', { value: surfaceAnimate });
      Object.defineProperty(chevron, 'animate', { value: chevronAnimate });
      Object.defineProperty(background, 'animate', {
        value: backgroundAnimate,
      });
      chevron.getBoundingClientRect = () =>
        buttons.toolbar.parentElement === pill
          ? new DOMRect(600, 100, 32, 40)
          : new DOMRect(550, width === 300 ? 50 : 100, 32, 32);
      surface.getBoundingClientRect = () =>
        new DOMRect(100, width === 300 ? 50 : 100, 450, 32);
      buttons.collapseButton.focus();
      buttons.collapseButton.dispatchEvent(
        new MouseEvent('click', { detail: 1 })
      );
      expect(buttons.toolbar.parentElement).toBe(controls);
      expect(document.activeElement).toBe(buttons.collapseButton);
      expect(buttons.toolbar.dataset.stacked).toBe(stacked);
      expect(chevronAnimate).toHaveBeenCalledWith(
        [
          { transform: 'translate(0px,0px)' },
          {
            transform:
              width === 300 ? 'translate(0px,0px)' : 'translate(50px,4px)',
          },
        ],
        expect.objectContaining({ duration: 400 })
      );
      expect(backgroundAnimate).toHaveBeenCalledTimes(width === 300 ? 1 : 2);
      if (width === 300) {
        expect(shellAnimate).toHaveBeenCalledWith(
          [
            { transform: 'translate(0px,0px)' },
            { transform: 'translate(50px,54px)' },
          ],
          expect.objectContaining({ duration: 400 })
        );
        expect(shellAnimate).toHaveBeenCalledWith(
          [
            { clipPath: 'inset(0px 0px 0px 0px round 20px)' },
            { clipPath: expect.stringContaining('round 16px)') },
          ],
          expect.objectContaining({ duration: 400, easing: 'linear' })
        );
      } else expect(shellAnimate).not.toHaveBeenCalled();
      expect(surfaceAnimate).toHaveBeenLastCalledWith(
        [
          { transform: 'translate(0px,0px)' },
          {
            transform:
              width === 300 ? 'translate(0px,0px)' : 'translate(50px,4px)',
          },
        ],
        expect.objectContaining({ duration: 400 })
      );
      await vi.advanceTimersByTimeAsync(400);
      expect(buttons.toolbar.parentElement).toBe(pill);
      expect(document.activeElement).toBe(buttons.collapseButton);
      expect(surface.hidden).toBe(true);
      expect(cancel).toHaveBeenCalledTimes(width === 300 ? 5 : 4);
      buttons.collapseButton.dispatchEvent(
        new MouseEvent('click', { detail: 1 })
      );
      expect(buttons.toolbar.parentElement).toBe(controls);
      expect(surface.hidden).toBe(false);
      expect(chevronAnimate).toHaveBeenLastCalledWith(
        [
          {
            transform:
              width === 300 ? 'translate(0px,0px)' : 'translate(50px,4px)',
          },
          { transform: 'translate(0px,0px)' },
        ],
        expect.objectContaining({ duration: 400 })
      );
      if (width === 300)
        expect(shellAnimate).toHaveBeenCalledWith(
          [
            { transform: 'translate(50px,54px)' },
            { transform: 'translate(0px,0px)' },
          ],
          expect.objectContaining({ duration: 400 })
        );
      await vi.advanceTimersByTimeAsync(400);
      expect(surface.hidden).toBe(false);
    }
  );

  it.each([300, 1000])(
    'morphs the native right-controls pill with the toolbar only on the same row at width %s',
    async (width) => {
      vi.useFakeTimers();
      const controls = document.querySelector(
        '.ytp-right-controls'
      ) as HTMLElement;
      controls.style.cssText =
        'background-color:rgba(0, 0, 0, 0.3);border-radius:28px';
      controls.innerHTML =
        '<div class="ytp-right-controls-left"><button class="ytp-subtitles-button" style="width:48px"></button></div>';
      const pill = controls.firstElementChild;
      const chrome = document.createElement('div');
      chrome.className = 'ytp-chrome-bottom';
      controls.before(chrome);
      chrome.append(controls);
      Object.defineProperty(chrome, 'clientWidth', { value: width });
      buttons.update(state());
      const nativePill = buttons.toolbar.querySelector(
        '.mfs-native-pill'
      ) as HTMLElement;
      const animate = vi.fn(() => ({ cancel: vi.fn() }));
      Object.defineProperty(nativePill, 'animate', { value: animate });
      controls.getBoundingClientRect = () =>
        buttons.toolbar.parentElement === pill
          ? new DOMRect(596, 100, 140, 40)
          : new DOMRect(96, 100, 640, 40);
      buttons.toolbar.getBoundingClientRect = () =>
        new DOMRect(100, 100, 490, 40);
      const click = () =>
        buttons.collapseButton.dispatchEvent(
          new MouseEvent('click', { detail: 1 })
        );
      click();
      if (width === 300) {
        expect(animate).not.toHaveBeenCalled();
        expect(nativePill.hidden).toBe(true);
        expect(controls.dataset.mfsMorphing).toBeUndefined();
        return;
      }
      expect(animate).toHaveBeenLastCalledWith(
        [
          { clipPath: 'inset(0px 0px 0px 0px round 28px)' },
          { clipPath: 'inset(0px 0px 0px 500px round 28px)' },
        ],
        expect.objectContaining({ duration: 400, easing: 'linear' })
      );
      expect(nativePill.hidden).toBe(false);
      expect(nativePill.style.left).toBe('-4px');
      expect(nativePill.style.width).toBe('640px');
      expect(nativePill.style.backgroundColor).toBe('rgba(0, 0, 0, 0.3)');
      expect(controls.dataset.mfsMorphing).toBe('true');
      await vi.advanceTimersByTimeAsync(400);
      expect(buttons.toolbar.parentElement).toBe(pill);
      expect(nativePill.hidden).toBe(true);
      expect(controls.dataset.mfsMorphing).toBeUndefined();
      click();
      expect(animate).toHaveBeenLastCalledWith(
        [
          { clipPath: 'inset(0px 0px 0px 500px round 28px)' },
          { clipPath: 'inset(0px 0px 0px 0px round 28px)' },
        ],
        expect.objectContaining({
          duration: 400,
          easing: 'cubic-bezier(.32,.72,0,1)',
        })
      );
      expect(controls.dataset.mfsMorphing).toBe('true');
      buttons.cleanup();
      expect(nativePill.hidden).toBe(true);
      expect(controls.dataset.mfsMorphing).toBeUndefined();
    }
  );

  it('reveals upright icons from the chevron outward and reverses their stagger on close', async () => {
    vi.useFakeTimers();
    buttons.update(state());
    buttons.collapseButton.click();
    const groups = [
      ...buttons.toolbar.querySelectorAll<HTMLElement>('[data-action]'),
    ];
    const animate = groups.map((group) => {
      const fn = vi.fn(() => ({ cancel: vi.fn() }));
      Object.defineProperty(group, 'animate', { value: fn });
      return fn;
    });
    const click = () =>
      buttons.collapseButton.dispatchEvent(
        new MouseEvent('click', { detail: 1 })
      );
    click();
    for (const [index, fn] of animate.entries()) {
      expect(fn).toHaveBeenLastCalledWith(
        [
          { opacity: '0', transform: 'scale(0.9)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        expect.objectContaining({
          delay: 30 + (groups.length - 1 - index) * 30,
          duration: 160,
        })
      );
    }
    await vi.advanceTimersByTimeAsync(400);
    click();
    for (const [index, fn] of animate.entries()) {
      expect(fn).toHaveBeenLastCalledWith(
        [
          expect.objectContaining({ opacity: '1' }),
          { opacity: 0, transform: 'scale(0.9)' },
        ],
        expect.objectContaining({ delay: index * 30, duration: 140 })
      );
      expect(JSON.stringify(fn.mock.calls)).not.toContain('rotate');
    }
    expect(buttons.toolbar.querySelector('style')?.textContent).not.toContain(
      'rotate('
    );
    await vi.advanceTimersByTimeAsync(400);
    expect(buttons.toolbar.dataset.collapsed).toBe('true');
  });

  it('folds immediately with reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    buttons.update(state());
    buttons.collapseButton.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 })
    );
    expect(buttons.container.hidden).toBe(true);
    expect(
      buttons.toolbar.querySelector<HTMLElement>('.mfs-youtube-actions')?.hidden
    ).toBe(true);
  });

  it('bookmarks on click, opens the editor on hold without adding, and supports Shift+Enter', async () => {
    vi.useFakeTimers();
    buttons.update(state());
    buttons.bookmarksButton.click();
    expect(actions.onBookmarks).toHaveBeenCalledOnce();
    actions.onBookmarks.mockClear();
    buttons.bookmarksButton.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, bubbles: true })
    );
    await vi.advanceTimersByTimeAsync(600);
    buttons.bookmarksButton.dispatchEvent(
      new Event('pointerup', { bubbles: true })
    );
    buttons.bookmarksButton.click();
    expect(actions.onEditBookmarks).toHaveBeenCalledOnce();
    expect(actions.onBookmarks).not.toHaveBeenCalled();
    buttons.bookmarksButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    expect(actions.onEditBookmarks).toHaveBeenCalledTimes(2);
    const next = state();
    next.bookmarks.enabled = false;
    buttons.update(next);
    expect(buttons.bookmarksButton.isConnected).toBe(false);
  });
  it('opens loop editing on hold without toggling on release and has no separate edit button', async () => {
    vi.useFakeTimers();
    buttons.update(state());
    expect(document.querySelector('.mfs-loop-edit-button')).toBeNull();
    buttons.loopButton.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, bubbles: true })
    );
    await vi.advanceTimersByTimeAsync(600);
    buttons.loopButton.dispatchEvent(new Event('pointerup', { bubbles: true }));
    buttons.loopButton.click();
    expect(actions.onEdit).toHaveBeenCalledOnce();
    expect(actions.onLoop).not.toHaveBeenCalled();
    expect(buttons.loopButton.nextElementSibling?.textContent).toContain(
      'Hold to edit loop sections'
    );
    buttons.loopButton.click();
    expect(actions.onLoop).toHaveBeenCalledOnce();
  });
  it('detects overflow inside modern flex controls and restores inline after widening', () => {
    let resize: (() => void) | undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.innerHTML =
      '<div class="ytp-chrome-controls" style="display:flex"><div class="ytp-left-controls" style="display:flex;flex:1;min-width:0"><button style="width:40px"></button><span style="width:40px;margin-left:12px"></span><div style="width:100px"></div><div class="ytp-chapter-container" style="width:300px"></div></div></div>';
    chrome.firstElementChild?.append(controls);
    controls.style.display = 'flex';
    controls.innerHTML =
      '<div class="ytp-right-controls-left" style="display:flex;width:80px"><button class="ytp-subtitles-button" style="width:48px"></button><button class="ytp-settings-button" style="width:48px"></button></div><div class="ytp-right-controls-right" style="display:flex;width:64px"><button style="width:48px"></button><button style="width:48px"></button></div>';
    let availableWidth = 576;
    Object.defineProperty(chrome, 'clientWidth', { get: () => availableWidth });
    const left = chrome.querySelector('.ytp-left-controls') as HTMLElement;
    Object.defineProperty(left, 'offsetWidth', {
      get: () => availableWidth - 576,
    });
    buttons.update(state());
    // The allocated left/right widths fit, but their actual controls do not.
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    availableWidth = 824;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('false');
    availableWidth = 576;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('true');
  });

  it('moves all custom controls above crowded native controls and restores the row on resize', () => {
    let resize: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      }
    );
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    const left = document.createElement('div');
    left.className = 'ytp-left-controls';
    chrome.append(left, controls);
    let availableWidth = 520;
    Object.defineProperty(chrome, 'clientWidth', { get: () => availableWidth });
    Object.defineProperty(left, 'offsetWidth', { value: 180 });
    chrome.getBoundingClientRect = () =>
      ({
        top: 400,
        bottom: 464,
        left: 0,
        right: availableWidth,
        width: availableWidth,
        height: 64,
      }) as DOMRect;
    for (const child of controls.children)
      Object.defineProperty(child, 'offsetWidth', { value: 48 });
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    expect(buttons.toolbar.style.bottom).toBe('72px');
    expect(buttons.toolbar.style.maxWidth).toBe('520px');
    expect(buttons.toolbar.querySelectorAll('button')).toHaveLength(9);
    expect(controls.querySelector('.ytp-subtitles-button')?.parentElement).toBe(
      controls
    );
    // Keep breathing room before contact, with extra room required to return.
    availableWidth = 716;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('false');
    expect(buttons.toolbar.style.bottom).toBe('');
    availableWidth = 707;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    availableWidth = 715;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    availableWidth = 716;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('false');
    availableWidth = 280;
    resize?.();
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    expect(buttons.toolbar.style.maxWidth).toBe('280px');
    buttons.cleanup();
    expect(disconnect).toHaveBeenCalled();
  });

  it('uses rendered native control widths instead of larger declared widths', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.append(controls);
    Object.defineProperty(chrome, 'clientWidth', { value: 496 });
    chrome.getBoundingClientRect = () => ({ width: 248 }) as DOMRect;
    for (const child of controls.children) {
      const element = child as HTMLElement;
      element.style.width = '48px';
      element.getBoundingClientRect = () => ({ width: 16 }) as DOMRect;
    }
    buttons.update(state());
    // 424px custom (including the chevron) + 64px native at 50% player scale.
    expect(buttons.toolbar.dataset.stacked).toBe('false');
  });
  it('reserves nested left controls, native row padding and the gap before overlap', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.innerHTML =
      '<div class="ytp-chrome-controls" style="display:flex;padding:0 20px;column-gap:12px"><div class="ytp-left-controls" style="width:40px"><button style="width:32px"></button><button style="width:32px"></button><span style="width:100px"></span></div></div>';
    const row = chrome.firstElementChild as HTMLElement;
    row.append(controls);
    let available = 700;
    Object.defineProperty(chrome, 'clientWidth', { get: () => available });
    Object.defineProperty(row, 'clientWidth', { get: () => available });
    for (const child of controls.children)
      Object.defineProperty(child, 'offsetWidth', { value: 48 });
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    available = 752;
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('false');
  });
  it.each([1, 0.5])(
    'detects painted controls nearing contact and stays stacked at scale %s',
    (scale) => {
      const controls = document.querySelector(
        '.ytp-right-controls'
      ) as HTMLElement;
      const chrome = document.createElement('div');
      chrome.className = 'ytp-chrome-bottom';
      controls.before(chrome);
      const left = document.createElement('div');
      left.className = 'ytp-left-controls';
      const time = document.createElement('span');
      left.append(time);
      chrome.append(left, controls);
      let available = 1000;
      Object.defineProperty(chrome, 'clientWidth', { get: () => available });
      chrome.getBoundingClientRect = () =>
        new DOMRect(0, 0, available * scale, 64 * scale);
      time.getBoundingClientRect = () =>
        new DOMRect(200 * scale, 10 * scale, 148 * scale, 40 * scale);
      buttons.toolbar.getBoundingClientRect = () =>
        new DOMRect(
          (available - 650) * scale,
          10 * scale,
          384 * scale,
          40 * scale
        );
      for (const child of controls.children)
        Object.defineProperty(child, 'offsetWidth', { value: 48 });
      buttons.update(state());
      expect(buttons.toolbar.dataset.stacked).toBe('true');
      buttons.update(state());
      expect(buttons.toolbar.dataset.stacked).toBe('true');
      available = 1020;
      buttons.update(state());
      expect(buttons.toolbar.dataset.stacked).toBe('false');
      buttons.update(state());
      expect(buttons.toolbar.dataset.stacked).toBe('false');
    }
  );
  it('observes nested native time and volume controls as their sizes change', () => {
    const observed = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observed;
        disconnect() {}
      }
    );
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.innerHTML =
      '<div class="ytp-left-controls"><div><span class="time"></span><input class="volume"></div></div>';
    chrome.append(controls);
    buttons.update(state());
    expect(observed).toHaveBeenCalledWith(chrome.querySelector('.time'));
    expect(observed).toHaveBeenCalledWith(chrome.querySelector('.volume'));
    expect(observed).not.toHaveBeenCalledWith(buttons.toolbar);
  });
  it('reserves room for an expanded volume slider without counting its clipped closed contents', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.innerHTML =
      '<div class="ytp-left-controls" style="display:flex"><button style="width:40px"></button><div class="volume" style="width:0px;overflow:hidden"><span style="display:block;width:60px"></span></div><span style="width:100px"></span></div>';
    chrome.append(controls);
    Object.defineProperty(chrome, 'clientWidth', { value: 690 });
    for (const child of controls.children)
      Object.defineProperty(child, 'offsetWidth', { value: 48 });
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('false');
    const volume = chrome.querySelector('.volume') as HTMLElement;
    volume.style.width = '60px';
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    volume.style.width = '0px';
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('false');
  });
  it('detects native right-hand icons overlapping custom controls even when container width totals fit', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.append(controls);
    let available = 1000;
    Object.defineProperty(chrome, 'clientWidth', { get: () => available });
    chrome.getBoundingClientRect = () => new DOMRect(0, 0, available, 64);
    const captions = controls.querySelector(
      '.ytp-subtitles-button'
    ) as HTMLElement;
    captions.getBoundingClientRect = () =>
      new DOMRect(available - 320, 10, 32, 40);
    for (const child of controls.children)
      Object.defineProperty(child, 'offsetWidth', { value: 48 });
    buttons.toolbar.getBoundingClientRect = () => new DOMRect(300, 10, 384, 40);
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    available = 1020;
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('false');
  });

  it('recalculates the layout when features are disabled', () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    const chrome = document.createElement('div');
    chrome.className = 'ytp-chrome-bottom';
    controls.before(chrome);
    chrome.append(controls);
    Object.defineProperty(chrome, 'clientWidth', { value: 320 });
    for (const child of controls.children)
      Object.defineProperty(child, 'offsetWidth', { value: 48 });
    buttons.update(state());
    expect(buttons.toolbar.dataset.stacked).toBe('true');
    const next = state();
    next.cinema.enabled =
      next.loop.enabled =
      next.infoCards.enabled =
      next.screenshot.enabled =
      next.filters.enabled =
      next.pip.enabled =
      next.bookmarks.enabled =
        false;
    buttons.update(next);
    expect(buttons.toolbar.dataset.stacked).toBe('false');
  });

  it('shows a second-line options hint only on buttons with long-press controls', () => {
    buttons.update(state());
    buttons.update(state());
    for (const button of [
      buttons.boostButton,
      buttons.cinemaButton,
      buttons.screenshotButton,
    ]) {
      const tip = button.nextElementSibling as HTMLElement;
      expect(tip.dataset.advanced).toBe('true');
      expect(tip.querySelectorAll('.mfs-tooltip-hint')).toHaveLength(1);
      expect(tip.querySelector('.mfs-tooltip-hint')?.textContent).toBe(
        'Hold for options'
      );
      expect(
        tip.querySelector('.mfs-tooltip-heading .ytp-tooltip-keyboard-shortcut')
      ).not.toBeNull();
    }
    expect(
      buttons.filtersButton.nextElementSibling?.querySelector(
        '.mfs-tooltip-hint'
      )
    ).toBeNull();
  });
  it('describes the current end-screen state separately from the click action', () => {
    const next = state();
    const button = buttons.infoCardsButton;
    const tip = button.nextElementSibling as HTMLElement;
    for (const visible of [true, false, true]) {
      next.infoCards.visible = visible;
      buttons.update(next);
      expect(button.getAttribute('aria-label')).toBe('End-screen cards');
      expect(button.getAttribute('aria-pressed')).toBe(String(visible));
      expect(tip.querySelector('.mfs-tooltip-label')?.textContent).toBe(
        `End-screen cards: ${visible ? 'visible' : 'hidden'}`
      );
      expect(tip.querySelectorAll('.mfs-tooltip-hint')).toHaveLength(1);
      expect(tip.querySelector('.mfs-tooltip-hint')?.textContent).toBe(
        `Click to ${visible ? 'hide' : 'show'} recommendations`
      );
      expect(button.getAttribute('aria-description')).toBe(
        `Recommendations are ${visible ? 'visible' : 'hidden'}. Activate to ${visible ? 'hide' : 'show'} them.`
      );
      expect(tip.dataset.multiline).toBe('true');
      expect(tip.dataset.advanced).toBeUndefined();
    }
    next.infoCards.available = false;
    buttons.update(next);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-description')).toBe(
      'Unavailable during ads.'
    );
    expect(tip.querySelector('.mfs-tooltip-label')?.textContent).toBe(
      'End-screen cards unavailable during ads'
    );
    expect(tip.querySelector<HTMLElement>('.mfs-tooltip-hint')?.hidden).toBe(
      true
    );
    expect(tip.dataset.multiline).toBe('false');
  });
  it('keeps inactive toggles clickable and exposes boxed native-style shortcut hints', () => {
    const next = state();
    next.infoCards.visible = false;
    buttons.update(next);
    for (const [button, key] of [
      [buttons.boostButton, 'B'],
      [buttons.cinemaButton, 'D'],
      [buttons.infoCardsButton, 'E'],
      [buttons.loopButton, 'R'],
      [buttons.screenshotButton, 'S'],
      [buttons.filtersButton, 'V'],
    ] as const) {
      expect(button.style.opacity).toBe('1');
      expect(button.disabled).toBe(false);
      expect(
        button.nextElementSibling?.querySelector(
          '.ytp-tooltip-keyboard-shortcut'
        )?.textContent
      ).toBe(key);
      expect(button.getAttribute('aria-keyshortcuts')).toContain(key);
    }
    expect(
      buttons.cinemaButton.querySelector('.mfs-toggle-fill')
    ).not.toBeNull();
    expect(
      buttons.infoCardsButton.querySelectorAll('.mfs-toggle-detail')
    ).toHaveLength(2);
    const native = document.querySelector(
      '.ytp-subtitles-button'
    ) as HTMLElement;
    native.style.width = '56px';
    native.style.height = '56px';
    buttons.update(next);
    expect(buttons.cinemaButton.style.width).toBe('56px');
    expect(buttons.cinemaButton.style.height).toBe('56px');
  });
  it.each(['boost', 'cinema', 'screenshot', 'pip'] as const)(
    'opens %s options on a hold without triggering its click',
    async (kind) => {
      vi.useFakeTimers();
      buttons.update(state());
      const button = buttons[`${kind}Button`];
      const action =
        kind === 'boost'
          ? actions.onBoost
          : kind === 'cinema'
            ? actions.onCinema
            : kind === 'pip'
              ? actions.onPip
              : actions.onScreenshot;
      button.dispatchEvent(
        new MouseEvent('pointerdown', { button: 0, bubbles: true })
      );
      await vi.advanceTimersByTimeAsync(599);
      expect(actions.onAdvanced).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(actions.onAdvanced).toHaveBeenCalledExactlyOnceWith(kind);
      button.dispatchEvent(new Event('pointerup', { bubbles: true }));
      button.click();
      expect(action).not.toHaveBeenCalled();
      button.dispatchEvent(
        new MouseEvent('pointerdown', { button: 0, bubbles: true })
      );
      button.dispatchEvent(new Event('pointerup', { bubbles: true }));
      button.click();
      expect(action).toHaveBeenCalledOnce();
    }
  );
  it.each(['pointerleave', 'pointercancel', 'pointerup'] as const)(
    'cancels a hold on %s',
    async (type) => {
      vi.useFakeTimers();
      buttons.update(state());
      buttons.boostButton.dispatchEvent(
        new MouseEvent('pointerdown', { button: 0, bubbles: true })
      );
      buttons.boostButton.dispatchEvent(new Event(type, { bubbles: true }));
      await vi.advanceTimersByTimeAsync(700);
      expect(actions.onAdvanced).not.toHaveBeenCalled();
    }
  );
  it('cancels holds after movement, disablement, and cleanup, and supports Shift+Enter', async () => {
    vi.useFakeTimers();
    buttons.update(state());
    buttons.boostButton.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, bubbles: true })
    );
    buttons.boostButton.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 20 })
    );
    await vi.advanceTimersByTimeAsync(700);
    expect(actions.onAdvanced).not.toHaveBeenCalled();
    buttons.boostButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    expect(actions.onAdvanced).toHaveBeenCalledExactlyOnceWith('boost');
    actions.onAdvanced.mockClear();
    buttons.boostButton.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, bubbles: true })
    );
    const next = state();
    next.boost.available = false;
    buttons.update(next);
    await vi.advanceTimersByTimeAsync(700);
    expect(actions.onAdvanced).not.toHaveBeenCalled();
    buttons.update(state());
    buttons.boostButton.dispatchEvent(
      new MouseEvent('pointerdown', { button: 0, bubbles: true })
    );
    buttons.cleanup();
    await vi.advanceTimersByTimeAsync(700);
    expect(actions.onAdvanced).not.toHaveBeenCalled();
  });
  it.each([
    { edge: 'right', buttonX: 600, tipX: 520, scale: 1, expected: -68 },
    { edge: 'left', buttonX: 0, tipX: -80, scale: 1, expected: 108 },
    { edge: 'scaled right', buttonX: 560, tipX: 500, scale: 2, expected: -14 },
  ])(
    'keeps the $edge tooltip inside the player',
    ({ buttonX, tipX, scale, expected }) => {
      buttons.update(state());
      const player = document.querySelector('#movie_player') as HTMLElement;
      player.getBoundingClientRect = () => new DOMRect(0, 0, 640, 360);
      const button = buttons.pipButton;
      Object.defineProperties(button, {
        offsetWidth: { value: 40 },
        offsetLeft: { value: 0 },
      });
      button.getBoundingClientRect = () =>
        new DOMRect(buttonX, 300, 40 * scale, 40 * scale);
      const tip = button.nextElementSibling as HTMLElement;
      tip.getBoundingClientRect = () => new DOMRect(tipX, 250, 200, 40);
      button.dispatchEvent(new Event('pointerenter'));
      expect(tip.style.left).toBe(`${expected}px`);
      expect(tip.style.maxWidth).toBe(`${624 / scale}px`);
      expect(tip.style.whiteSpace).toBe('normal');
    }
  );
  it('anchors every tooltip to its button instead of a stale native tooltip position', () => {
    const nativeTip = document.createElement('div');
    nativeTip.className = 'ytp-tooltip';
    nativeTip.style.top = '200px';
    nativeTip.innerHTML =
      '<div class="ytp-tooltip-text-wrapper"><span class="ytp-tooltip-text" style="font-size:14px">Old seek tooltip</span></div>';
    document.querySelector('#movie_player')?.append(nativeTip);
    buttons.update(state());
    for (const button of [
      buttons.boostButton,
      buttons.cinemaButton,
      buttons.loopButton,
      buttons.infoCardsButton,
      buttons.screenshotButton,
      buttons.filtersButton,
    ]) {
      Object.defineProperties(button, {
        offsetLeft: { value: button === buttons.loopButton ? 40 : 0 },
        offsetWidth: { value: button === buttons.loopButton ? 32 : 40 },
      });
      button.dispatchEvent(new Event('pointerenter'));
      const tip = button.nextElementSibling as HTMLElement;
      expect(tip.getAttribute('role')).toBe('tooltip');
      expect(tip.style.top).toBe('');
      expect(tip.style.bottom).toBe('calc(100% + 12px)');
      expect(tip.style.left).toBe(
        button === buttons.loopButton ? '56px' : '20px'
      );
      expect(tip.style.fontSize).toBe('14px');
      nativeTip.style.top = '400px';
      button.focus();
      expect(tip.style.top).toBe('');
    }
    expect(buttons.toolbar.querySelector('style')?.textContent).toContain(
      'bottom:calc(100% + 12px)'
    );
  });
  it('keeps tooltip centers in local coordinates when the player is scaled or resized', () => {
    buttons.update(state());
    const button = buttons.loopButton;
    Object.defineProperties(button, {
      offsetLeft: { value: 40 },
      offsetTop: { value: 8 },
      offsetWidth: { value: 32 },
    });
    button.getBoundingClientRect = () => new DOMRect(480, 700, 64, 96);
    buttons.container.getBoundingClientRect = () =>
      new DOMRect(400, 700, 144, 96);
    button.dispatchEvent(new Event('pointerenter'));
    const tip = button.nextElementSibling as HTMLElement;
    expect(tip.style.left).toBe('56px');
    expect(tip.style.bottom).toBe('calc(100% + 4px)');
    buttons.container.style.transform = 'scale(0.75)';
    button.focus();
    expect(tip.style.left).toBe('56px');
    expect(tip.style.top).toBe('');
  });
  it.each(Array.from({ length: 256 }, (_, i) => i))(
    'keeps the correct order for feature combination %i',
    (mask) => {
      const next = state();
      next.boost.level = mask & 1 ? 2 : 0;
      next.cinema.enabled = Boolean(mask & 2);
      next.loop.enabled = Boolean(mask & 4);
      next.infoCards.enabled = Boolean(mask & 8);
      next.screenshot.enabled = Boolean(mask & 16);
      next.filters.enabled = Boolean(mask & 32);
      next.pip.enabled = Boolean(mask & 64);
      next.bookmarks.enabled = Boolean(mask & 128);
      buttons.update(next);
      const controls = document.querySelector(
        '.ytp-right-controls'
      ) as HTMLElement;
      expect(controls.querySelectorAll('.mfs-youtube-controls')).toHaveLength(
        mask ? 1 : 0
      );
      const expected = [
        mask & 1 && 'Boost Volume',
        mask & 2 && 'Cinema Mode',
        mask & 4 && 'Loop Sections',
        mask & 128 && 'Bookmarks',
        mask & 8 && 'End-screen cards',
        mask & 16 && 'Screenshot',
        mask & 32 && 'Video Filters',
        mask & 64 && 'Picture-in-Picture',
        mask && 'Collapse custom actions',
      ].filter(Boolean);
      expect(
        [...controls.querySelectorAll('.mfs-player-button')].map((node) =>
          node.getAttribute('aria-label')
        )
      ).toEqual(expected);
      if (mask) expect(controls.firstElementChild).toBe(buttons.toolbar);
    }
  );
  it('opens PiP from its native-style button and blocks unavailable playback', () => {
    const next = state();
    buttons.update(next);
    expect(buttons.pipButton.querySelector('svg rect')).not.toBeNull();
    expect(buttons.pipButton.getAttribute('aria-keyshortcuts')).toBe(
      'P Shift+P Shift+Enter'
    );
    expect(buttons.pipButton.nextElementSibling?.textContent).toContain(
      'Open Picture-in-Picture'
    );
    buttons.pipButton.click();
    expect(actions.onPip).toHaveBeenCalledOnce();
    next.pip.available = false;
    buttons.update(next);
    buttons.pipButton.click();
    expect(actions.onPip).toHaveBeenCalledOnce();
    expect(buttons.pipButton.disabled).toBe(true);
    buttons.cleanup();
    buttons.pipButton.click();
    expect(actions.onPip).toHaveBeenCalledOnce();
  });
  it('sets action tooltips and accurate pressed states and blocks unavailable controls', () => {
    const next = state();
    next.cinema.active = true;
    next.infoCards.visible = false;
    next.loop.expanded = true;
    buttons.update(next);
    expect(buttons.cinemaButton.getAttribute('aria-pressed')).toBe('true');
    expect(buttons.infoCardsButton.getAttribute('aria-pressed')).toBe('false');
    expect(buttons.loopButton.getAttribute('aria-expanded')).toBe('true');
    expect(buttons.toolbar.textContent).toContain('Turn off Cinema Mode');
    expect(buttons.toolbar.textContent).toContain('End-screen cards: hidden');
    expect(buttons.toolbar.textContent).toContain(
      'Click to show recommendations'
    );
    buttons.cinemaButton.click();
    buttons.infoCardsButton.click();
    buttons.loopButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true })
    );
    buttons.screenshotButton.click();
    buttons.filtersButton.click();
    expect(buttons.filtersButton.getAttribute('aria-haspopup')).toBe('dialog');
    expect(buttons.filtersButton.getAttribute('aria-expanded')).toBe('false');
    expect(actions.onFilters).toHaveBeenCalledOnce();
    expect(buttons.screenshotButton.hasAttribute('aria-pressed')).toBe(false);
    expect(buttons.toolbar.textContent).toContain('Save video frame as PNG');
    expect(actions.onScreenshot).toHaveBeenCalledOnce();
    expect(actions.onCinema).toHaveBeenCalledOnce();
    expect(actions.onInfoCards).toHaveBeenCalledOnce();
    expect(actions.onEdit).toHaveBeenCalledOnce();
    next.cinema.available = false;
    next.infoCards.available = false;
    next.loop.available = false;
    next.boost.available = false;
    next.screenshot.available = false;
    next.filters.available = false;
    buttons.update(next);
    for (const button of [
      buttons.cinemaButton,
      buttons.infoCardsButton,
      buttons.loopButton,
      buttons.boostButton,
      buttons.screenshotButton,
      buttons.filtersButton,
    ]) {
      expect(button.disabled).toBe(true);
      button.click();
    }
    expect(actions.onCinema).toHaveBeenCalledOnce();
    expect(actions.onInfoCards).toHaveBeenCalledOnce();
    expect(actions.onEdit).toHaveBeenCalledOnce();
    expect(actions.onBoost).not.toHaveBeenCalled();
    expect(actions.onScreenshot).toHaveBeenCalledOnce();
    expect(actions.onFilters).toHaveBeenCalledOnce();
  });
  it('preserves focused buttons, reattaches to replaced controls, and disposes every control', () => {
    buttons.update(state());
    buttons.cinemaButton.focus();
    buttons.update(state());
    expect(document.activeElement).toBe(buttons.cinemaButton);
    const old = document.querySelector('.ytp-right-controls') as HTMLElement;
    const replacement = document.createElement('div');
    replacement.className = 'ytp-right-controls';
    replacement.innerHTML = '<button class="ytp-subtitles-button"></button>';
    old.replaceWith(replacement);
    buttons.update(state());
    buttons.update(state());
    expect(replacement.firstElementChild).toBe(buttons.toolbar);
    expect(document.querySelectorAll('.mfs-youtube-controls')).toHaveLength(1);
    expect(old.querySelector('.mfs-youtube-controls')).toBeNull();
    buttons.cleanup();
    buttons.update(state());
    buttons.cinemaButton.click();
    buttons.infoCardsButton.click();
    buttons.screenshotButton.click();
    buttons.filtersButton.click();
    expect(document.querySelector('.mfs-youtube-controls')).toBeNull();
    expect(actions.onCinema).not.toHaveBeenCalled();
    expect(actions.onInfoCards).not.toHaveBeenCalled();
    expect(actions.onScreenshot).not.toHaveBeenCalled();
    expect(actions.onFilters).not.toHaveBeenCalled();
  });
  it('does not attach controls for secondary videos', () => {
    const secondary = document.createElement('video');
    document.querySelector('#movie_player')?.append(secondary);
    buttons.cleanup();
    buttons = new YouTubePlayerButtons(secondary, actions);
    buttons.update(state());
    expect(document.querySelector('.mfs-youtube-controls')).toBeNull();
  });
});
