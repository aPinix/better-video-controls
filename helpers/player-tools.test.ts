// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.youtube.com/watch?v=test-video"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerTools } from './player-tools';
import { CINEMA_PREVIEW_KEY } from './player-cinema-preview';
import { DEFAULT_PLAYER_TOOLS } from './player-tools-settings';
import { type MediaLibrary, validMoment } from './saved-media';
import * as youtubeChapters from './youtube-chapters';

let tools: PlayerTools | undefined;
let video: HTMLVideoElement;
let root: ShadowRoot;
const send = vi.fn();
const changed = { addListener: vi.fn(), removeListener: vi.fn() };
const findButton = (text: string) => {
  const button = [...root.querySelectorAll('button')].find(
    (node) => node.textContent === text
  );
  if (!button) throw new Error(`Button missing: ${text}`);
  return button;
};
const inputFor = (text: string) => {
  const label = [...root.querySelectorAll('label')].find(
    (node) => node.textContent === text
  );
  const input = label?.querySelector('input');
  if (!input) throw new Error(`Input missing: ${text}`);
  return input;
};
const loopEditorRoot = () => {
  const shadow = document.querySelector('.mfs-loop-surface')?.shadowRoot;
  if (!shadow) throw new Error('Loop editor missing');
  return shadow;
};
const loopEditorTrack = () => {
  const track = loopEditorRoot().querySelector<HTMLElement>('.timeline');
  if (!track) throw new Error('Loop timeline missing');
  return track;
};
const loopPointer = (target: Element, type: string, time: number, shiftKey = false) => {
  const event = new MouseEvent(type, { bubbles: true, clientX: time * 6.4, button: 0, shiftKey });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
};
beforeEach(async () => {
  vi.useFakeTimers();
  send.mockImplementation(async ({ command }) =>
    command.op === 'list' ? { library: { version: 1, items: [] } } : {}
  );
  vi.stubGlobal('chrome', {
    storage: {
      sync: {
        get: vi.fn(async () => ({
          playerTools: {
            ...DEFAULT_PLAYER_TOOLS,
            backward: 10,
            forward: 10,
            youtubeLoop: true,
            rememberYoutubeLoops: true,
          },
        })),
        set: vi.fn(async () => {}),
      },
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) },
      onChanged: changed,
    },
    runtime: { sendMessage: send },
  });
  document.body.innerHTML =
    '<div id="movie_player"><video class="html5-main-video" src="https://example.com/lesson.mp4"></video><div id="timeline"></div><div class="ytp-right-controls"><button class="ytp-autonav-toggle"></button><button class="ytp-subtitles-button"></button></div></div>';
  video = document.querySelector('video') as HTMLVideoElement;
  Object.defineProperties(video, {
    duration: { value: 100, configurable: true },
    readyState: { value: 4 },
    paused: { value: true, configurable: true },
  });
  video.currentTime = 25;
  video.play = vi.fn(async () => {
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.dispatchEvent(new Event('play'));
  });
  video.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 640,
    bottom: 360,
    width: 640,
    height: 360,
    toJSON() {},
  });
  const timeline = document.querySelector('#timeline') as HTMLElement;
  const player = document.querySelector('#movie_player') as HTMLElement;
  player.getBoundingClientRect = () => video.getBoundingClientRect();
  timeline.getBoundingClientRect = () => ({
    x: 0,
    y: 350,
    top: 350,
    left: 0,
    right: 640,
    bottom: 360,
    width: 640,
    height: 10,
    toJSON() {},
  });
  tools = new PlayerTools(video, timeline);
  root = (document.querySelector('.mfs-player-tools') as HTMLElement)
    .shadowRoot as ShadowRoot;
  await vi.advanceTimersByTimeAsync(0);
});
afterEach(() => {
  tools?.cleanup();
  tools = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('player tools integration', () => {
  it('defaults screenshot filters on and keeps the older screenshot control in sync with the saved choice', async () => {
    tools?.cleanup();
    const hostname = vi.spyOn(youtubeChapters, 'isYouTubeHostname').mockReturnValue(false);
    try {
      tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
      root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
      await vi.advanceTimersByTimeAsync(0);
      const filters = inputFor('Include filters in screenshot');
      expect(filters.checked).toBe(true);
      filters.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        playerTools: expect.objectContaining({ youtubeScreenshotIncludeFilters: false }),
      });
      const storage = changed.addListener.mock.calls.at(-1)?.[0];
      storage({ playerTools: { newValue: DEFAULT_PLAYER_TOOLS } }, 'sync');
      expect(filters.checked).toBe(true);
    } finally {
      hostname.mockRestore();
    }
  });
  it('omits the floating Tools launcher on other websites', async () => {
    tools?.cleanup();
    const hostname = vi.spyOn(youtubeChapters, 'isYouTubeHostname').mockReturnValue(false);
    try {
      tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
      root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
      document.dispatchEvent(new MouseEvent('pointermove', { clientX: 320, clientY: 180 }));
      await vi.advanceTimersByTimeAsync(300);
      expect(root.querySelector('.launcher')).toBeNull();
      expect((root.querySelector('.panel') as HTMLElement).hidden).toBe(true);
    } finally {
      hostname.mockRestore();
    }
  });
  it('omits the floating Tools launcher on YouTube while keeping player controls', async () => {
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 320, clientY: 180 }));
    await vi.advanceTimersByTimeAsync(300);
    expect(root.querySelector('.launcher')).toBeNull();
    expect((root.querySelector('.panel') as HTMLElement).hidden).toBe(true);
    expect(document.querySelector('.mfs-youtube-controls')).not.toBeNull();
    expect(document.querySelector('.mfs-loop-button')).not.toBeNull();
    expect(document.querySelector('.mfs-bookmarks-button')).not.toBeNull();
  });
  it.each([
    [true, 5, 10, 30],
    [true, 25, 10, 30],
    [false, 25, 10, 30],
    [false, 10, 10, 30],
    [false, 30, 10, 30],
    [false, 25, 30, 10],
    [true, 40, 30, 10],
  ] as const)('preserves contained playback and starts outside playback at the new section (paused: %s, position: %s, draw: %s to %s)', async (paused, position, start, end) => {
    Object.defineProperty(video, 'paused', { value: paused, configurable: true });
    video.play = vi.fn(async () => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
    });
    video.currentTime = position;
    const track = document.querySelector('.mfs-loop-surface')?.shadowRoot?.querySelector('.timeline') as HTMLElement;
    track.getBoundingClientRect = video.getBoundingClientRect;
    findButton('Edit loop').click();
    for (const [type, x] of [['pointerdown', start * 6.4], ['pointermove', end * 6.4], ['pointerup', end * 6.4]] as const) {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      track.dispatchEvent(event);
    }
    expect(video.paused).toBe(false);
    const expectedTime = !paused && position >= Math.min(start, end) && position < Math.max(start, end) ? position : Math.min(start, end);
    expect(video.currentTime).toBe(expectedTime);
    expect(video.play).toHaveBeenCalledTimes(paused ? 1 : 0);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);
    expect(video.paused).toBe(false);
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.dispatchEvent(new Event('play'));
    expect(video.currentTime).toBe(expectedTime);
    expect(video.paused).toBe(false);
    findButton('Disable loop').click();
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
    video.currentTime = 5;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.dispatchEvent(new Event('play'));
    expect(video.currentTime).toBe(5);
  });
  it.each([true, false])('keeps playing an existing section while adding multiple new sections (enabled: %s)', async (enabled) => {
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 15;
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    for (const [index, [start, end]] of ([[10, 20], [30, 40], [50, 60]] as const).entries()) {
      if (index === 1 && !enabled) findButton('Disable loop').click();
      loopPointer(track, 'pointerdown', start, index > 0);
      loopPointer(track, 'pointermove', end, index > 0);
      loopPointer(track, 'pointerup', end, index > 0);
      expect(video.currentTime).toBe(15);
      expect(video.paused).toBe(false);
      expect(inputFor('A (seconds)').valueAsNumber).toBe(10);
      expect(inputFor('B (seconds)').valueAsNumber).toBe(20);
      expect(track.querySelectorAll('.saved-range')).toHaveLength(index);
      await vi.advanceTimersByTimeAsync(1000);
      expect(video.currentTime).toBe(15);
    }
    expect(video.play).not.toHaveBeenCalled();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(1000);
    video.dispatchEvent(new Event('play'));
    expect(video.currentTime).toBe(15);
    expect(send.mock.calls.flatMap(([message]) => message.command.op === 'put' ? [message.command.item] : message.command.op === 'replace-loops' ? message.command.items : [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ start: 10, end: 20 }),
      expect.objectContaining({ start: 30, end: 40 }),
      expect.objectContaining({ start: 50, end: 60 }),
    ]));
  });
  it('uses the playback position at release and preserves any containing section, not just the selected one', async () => {
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 15;
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    for (const [index, [start, end, time]] of ([[10, 20, 15], [30, 40, 35], [50, 60, 15]] as const).entries()) {
      loopPointer(track, 'pointerdown', start, index > 0);
      loopPointer(track, 'pointermove', end, index > 0);
      video.currentTime = time;
      loopPointer(track, 'pointerup', end, index > 0);
      expect(video.currentTime).toBe(time);
      expect(inputFor('A (seconds)').valueAsNumber).toBe(time === 35 ? 30 : 10);
      await vi.advanceTimersByTimeAsync(1000);
      expect(video.currentTime).toBe(time);
    }
    expect(track.querySelectorAll('.saved-range')).toHaveLength(2);
    expect(video.play).not.toHaveBeenCalled();
  });
  const createMultipleSections = async () => {
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    for (const [index, [start, end]] of ([[10, 20], [30, 40], [50, 60]] as const).entries()) {
      loopPointer(track, 'pointerdown', start, index > 0);
      loopPointer(track, 'pointermove', end, index > 0);
      loopPointer(track, 'pointerup', end, index > 0);
      await vi.advanceTimersByTimeAsync(0);
    }
    return track;
  };
  it.each([
    { paused: false, target: 15, start: 10, end: 20, next: 30, editorOpen: false },
    { paused: false, target: 35, start: 30, end: 40, next: 50, editorOpen: false },
    { paused: false, target: 55, start: 50, end: 60, next: 10, editorOpen: false },
    { paused: false, target: 30, start: 30, end: 40, next: 50, editorOpen: false },
    { paused: true, target: 35, start: 30, end: 40, next: 50, editorOpen: false },
    { paused: false, target: 35, start: 30, end: 40, next: 50, editorOpen: true },
  ])('preserves native seeks into a section and continues from that section (paused: $paused, target: $target, editor open: $editorOpen)', async ({ paused, target, start, end, next, editorOpen }) => {
    const track = await createMultipleSections();
    if (!editorOpen) (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);
    Object.defineProperty(video, 'paused', { value: paused, configurable: true });

    video.currentTime = target;
    Object.defineProperty(video, 'seeking', { value: true, configurable: true });
    video.dispatchEvent(new Event('seeking'));
    video.dispatchEvent(new Event('timeupdate'));
    await vi.advanceTimersByTimeAsync(1200);
    expect(video.currentTime).toBe(target);

    Object.defineProperty(video, 'seeking', { value: false, configurable: true });
    video.dispatchEvent(new Event('seeked'));
    await vi.advanceTimersByTimeAsync(1200);
    expect(video.currentTime).toBe(target);
    expect(video.paused).toBe(paused);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(start);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(end);

    if (paused) await video.play();
    video.currentTime = end;
    video.dispatchEvent(new Event('timeupdate'));
    await vi.advanceTimersByTimeAsync(20);
    expect(video.currentTime).toBe(next);
  });
  it('preserves forward and backward native seeks when YouTube resumes before seeked', async () => {
    const track = await createMultipleSections();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);

    for (const [target, start] of [[55, 50], [15, 10]] as const) {
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      video.currentTime = target;
      Object.defineProperty(video, 'seeking', { value: true, configurable: true });
      video.dispatchEvent(new Event('seeking'));
      await video.play();
      expect(video.currentTime).toBe(target);
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(target);
      Object.defineProperty(video, 'seeking', { value: false, configurable: true });
      video.dispatchEvent(new Event('seeked'));
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(target);
      expect(inputFor('A (seconds)').valueAsNumber).toBe(start);
    }
  });
  it('does not let a pending loop timer interrupt an in-progress native seek', async () => {
    const track = await createMultipleSections();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(360);

    // The pending timer can run before the browser delivers the seeking event.
    video.currentTime = 19.9;
    video.dispatchEvent(new Event('timeupdate'));
    video.currentTime = 55;
    Object.defineProperty(video, 'seeking', { value: true, configurable: true });
    await vi.advanceTimersByTimeAsync(150);
    expect(video.currentTime).toBe(55);
    Object.defineProperty(video, 'seeking', { value: false, configurable: true });
    video.dispatchEvent(new Event('seeked'));
    await vi.advanceTimersByTimeAsync(1200);
    expect(video.currentTime).toBe(55);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(50);
  });
  it.each([
    { paused: false, editorOpen: false },
    { paused: true, editorOpen: false },
    { paused: false, editorOpen: true },
  ])('snaps every outside seek to the nearest section start (paused: $paused, editor open: $editorOpen)', async ({ paused, editorOpen }) => {
    const track = await createMultipleSections();
    if (!editorOpen) (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);
    Object.defineProperty(video, 'paused', { value: paused, configurable: true });

    // Include repeated clicks, both sides of each gap, ties, and section ends.
    for (const [target, start, end, next] of [
      [23, 10, 20, 30], [23, 10, 20, 30],
      [27, 30, 40, 50], [27, 30, 40, 50],
      [45, 30, 40, 50], [25, 10, 20, 30],
      [0, 10, 20, 30], [100, 50, 60, 10],
      [20, 10, 20, 30], [40, 30, 40, 50], [60, 50, 60, 10],
    ] as const) {
      video.currentTime = target;
      Object.defineProperty(video, 'seeking', { value: true, configurable: true });
      video.dispatchEvent(new Event('seeking'));
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(target);
      Object.defineProperty(video, 'seeking', { value: false, configurable: true });
      video.dispatchEvent(new Event('seeked'));
      expect(video.currentTime).toBe(start);
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(start);
      expect(video.paused).toBe(paused);
      expect(track.dataset.loopEnabled).toBe('true');
      expect(inputFor('A (seconds)').valueAsNumber).toBe(start);
      expect(inputFor('B (seconds)').valueAsNumber).toBe(end);

      // Playback must continue in order from the section chosen by the seek.
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.currentTime = end;
      video.dispatchEvent(new Event('timeupdate'));
      await vi.advanceTimersByTimeAsync(20);
      expect(video.currentTime).toBe(next);
      Object.defineProperty(video, 'paused', { value: paused, configurable: true });
    }
  });
  it('snaps an outside seek after YouTube resumes before seeked', async () => {
    const track = await createMultipleSections();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);

    for (const target of [47, 47]) {
      video.currentTime = target;
      Object.defineProperty(video, 'seeking', { value: true, configurable: true });
      video.dispatchEvent(new Event('seeking'));
      await video.play();
      expect(video.currentTime).toBe(target);
      Object.defineProperty(video, 'seeking', { value: false, configurable: true });
      video.dispatchEvent(new Event('seeked'));
      expect(video.currentTime).toBe(50);
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(50);
    }
  });
  it('leaves native seeks unrestricted when looping is disabled', async () => {
    const track = await createMultipleSections();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    findButton('Disable loop').click();
    for (const target of [55, 25, 25, 0, 99]) {
      video.currentTime = target;
      video.dispatchEvent(new Event('seeking'));
      video.dispatchEvent(new Event('seeked'));
      await video.play();
      await vi.advanceTimersByTimeAsync(1200);
      expect(video.currentTime).toBe(target);
      expect(track.dataset.loopEnabled).toBe('false');
      expect(inputFor('A (seconds)').valueAsNumber).toBe(10);
    }
  });
  it('replaces all sections with a plain drag across existing ranges and supports undo, redo and discard', async () => {
    const track = await createMultipleSections();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);
    send.mockClear();
    video.currentTime = 15;
    loopPointer(track, 'pointerdown', 80);
    loopPointer(track, 'pointermove', 5);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    loopPointer(track, 'pointerup', 5);
    await vi.advanceTimersByTimeAsync(0);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(5);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(80);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    expect(video.currentTime).toBe(15);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({
      op: 'replace-loops', mediaKey: 'youtube:test-video', items: [expect.objectContaining({ start: 5, end: 80 })],
    }) }));
    (track.querySelector('.undo-loop-sections') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(2);
    (track.querySelector('.redo-loop-sections') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(80);
    (track.querySelector('.discard-loop-edits') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(2);
  });
  it.each(['pointercancel', 'click'])('keeps existing sections when a replacement drag is unfinished (%s)', async (end) => {
    const track = await createMultipleSections();
    send.mockClear();
    loopPointer(track, 'pointerdown', 80);
    if (end !== 'click') loopPointer(track, 'pointermove', 5);
    loopPointer(track, end === 'click' ? 'pointerup' : end, end === 'click' ? 80 : 5);
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(2);
    expect(send.mock.calls.some(([message]) => ['replace-loops', 'delete', 'put'].includes(message.command.op))).toBe(false);
  });
  it.each(['active', 'saved'])('replaces both persisted sections when dragging from the %s section body after reopening', async (target) => {
    const library = new Map<string, import('./saved-media').SavedMoment>();
    send.mockImplementation(async ({ command }) => {
      if (command.op === 'put') library.set(command.item.id, command.item);
      if (command.op === 'delete') library.delete(command.id);
      if (command.op === 'replace-loops') {
        for (const [id, item] of library)
          if (item.mediaKey === command.mediaKey && item.end !== undefined) library.delete(id);
        for (const item of command.items) library.set(item.id, item);
      }
      return { library: { version: 1, items: [...library.values()] } };
    });
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    let track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    for (const [index, [start, end]] of ([[10, 20], [30, 40]] as const).entries()) {
      loopPointer(track, 'pointerdown', start, index > 0);
      loopPointer(track, 'pointermove', end, index > 0);
      loopPointer(track, 'pointerup', end, index > 0);
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(library.size).toBe(2);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    tools?.cleanup();
    const timeline = document.querySelector('#timeline') as HTMLElement;
    tools = new PlayerTools(video, timeline);
    root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
    await vi.advanceTimersByTimeAsync(0);
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);
    track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    const body = track.querySelector(target === 'active' ? '.range' : '.saved-range') as HTMLElement;
    const start = target === 'active' ? 15 : 35;
    loopPointer(body, 'pointerdown', start);
    loopPointer(track, 'pointermove', 80);
    loopPointer(track, 'pointerup', 80);
    await vi.advanceTimersByTimeAsync(0);
    expect(library.size).toBe(1);
    expect([...library.values()][0]).toMatchObject({ start, end: 80 });
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(start);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(80);
  });
  it('restores bookmarks and loop sections in a fresh controller after a page refresh', async () => {
    const library = new Map<string, import('./saved-media').SavedMoment>();
    send.mockImplementation(async ({ command }) => {
      if (command.op === 'put') library.set(command.item.id, command.item);
      if (command.op === 'replace-loops') {
        for (const [id, item] of library)
          if (item.mediaKey === command.mediaKey && item.end !== undefined) library.delete(id);
        for (const item of command.items) library.set(item.id, item);
      }
      return { library: { version: 1, items: [...library.values()] } };
    });
    await createMultipleSections();
    document.querySelector<HTMLButtonElement>('.mfs-bookmarks-button')?.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(library.size).toBe(4);
    tools?.cleanup();
    window.history.replaceState(null, '', '/watch?v=test-video&list=playlist&t=42');
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
    await vi.advanceTimersByTimeAsync(0);
    expect(loopEditorTrack().querySelectorAll('.saved-range')).toHaveLength(3);
    document.querySelector('.mfs-bookmarks-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const editor = document.querySelector('.mfs-youtube-bookmarks-editor')?.shadowRoot;
    expect(editor?.querySelectorAll('.point')).toHaveLength(1);
    expect(editor?.querySelector<HTMLInputElement>('[aria-label="Bookmark name"]')?.value).toContain('Moment');
  });
  const startupLibrary = (): { library: MediaLibrary } => {
    const base = { mediaKey: 'youtube:test-video', url: document.location.href, title: 'Test', createdAt: 1 };
    return { library: { version: 1, items: [
      { ...base, id: 'saved-bookmark', name: 'Saved bookmark', start: 45 },
      { ...base, id: 'saved-loop', name: 'Saved loop', start: 50, end: 70 },
    ] } };
  };
  it.each(['saved-bookmark', 'saved-loop'])('opens the claimed %s in its player editor with the correct saved item selected', async (id) => {
    tools?.cleanup();
    const library = startupLibrary().library;
    const item = library.items.find((entry) => entry.id === id)!;
    library.items.unshift({ ...library.items[0]!, id: 'earlier-bookmark', start: 5, name: 'Earlier bookmark' });
    library.items.push({ ...library.items[1]!, id: 'earlier-loop', start: 10, end: 20, name: 'Earlier loop' });
    send.mockImplementation(async ({ command }) => command.op === 'claim'
      ? { item, edit: true }
      : { library });
    video.pause = vi.fn(() => {
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
    });
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
    await vi.advanceTimersByTimeAsync(0);
    expect(video.currentTime).toBe(item.start);
    expect(video.pause).toHaveBeenCalled();
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-editing')).toBe('true');
    const bookmarks = document.querySelector('.mfs-youtube-bookmarks-editor') as HTMLElement;
    if (item.end === undefined) {
      expect(bookmarks.hidden).toBe(false);
      const editor = bookmarks.shadowRoot!;
      const name = editor.querySelector<HTMLInputElement>('[aria-label="Bookmark name"]')!;
      expect(name.value).toBe(item.name);
      expect(editor.querySelector<HTMLButtonElement>('.point[aria-pressed="true"]')?.dataset.bookmarkId).toBe(item.id);
      expect(editor.activeElement).toBe(name);
      name.value = 'Edited in the player';
      name.dispatchEvent(new Event('change'));
      await vi.advanceTimersByTimeAsync(0);
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: { op: 'put', item: { ...item, name: 'Edited in the player' } } }));
    } else {
      expect(bookmarks.hidden).toBe(true);
      expect(loopEditorTrack().classList.contains('editing')).toBe(true);
      expect(loopEditorTrack().querySelector<HTMLElement>('.range')?.style.left).toBe('50%');
      expect(loopEditorTrack().querySelector<HTMLElement>('.range')?.style.width).toBe('20%');
      const handle = loopEditorTrack().querySelector<HTMLButtonElement>('.range .handle.start')!;
      expect(loopEditorRoot().activeElement).toBe(handle);
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }));
      await vi.advanceTimersByTimeAsync(0);
      expect(send.mock.calls.some(([message]) => message.command.op === 'put' && message.command.item.id === item.id && message.command.item.start === 50.1)).toBe(true);
    }
  });

  it.each(['saved-bookmark', 'saved-loop'])('keeps ordinary playback of %s separate from editing', async (id) => {
    tools?.cleanup();
    const library = startupLibrary().library;
    const item = library.items.find((entry) => entry.id === id)!;
    send.mockImplementation(async ({ command }) => command.op === 'claim' ? { item } : { library });
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    await vi.advanceTimersByTimeAsync(0);
    expect(video.currentTime).toBe(item.start);
    expect(loopEditorTrack().classList.contains('editing')).toBe(false);
    expect((document.querySelector('.mfs-youtube-bookmarks-editor') as HTMLElement).hidden).toBe(true);
  });

  it('waits for video metadata before claiming and opening an editor', async () => {
    tools?.cleanup();
    const library = startupLibrary().library;
    const item = library.items[0]!;
    send.mockClear();
    send.mockImplementation(async ({ command }) => command.op === 'claim' ? { item, edit: true } : { library });
    video.pause = vi.fn();
    Object.defineProperty(video, 'duration', { value: Number.NaN, configurable: true });
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    await vi.advanceTimersByTimeAsync(0);
    expect(send.mock.calls.some(([message]) => message.command.op === 'claim')).toBe(false);
    Object.defineProperty(video, 'duration', { value: 100, configurable: true });
    video.dispatchEvent(new Event('loadedmetadata'));
    await vi.advanceTimersByTimeAsync(0);
    const bookmarks = document.querySelector('.mfs-youtube-bookmarks-editor') as HTMLElement;
    expect(bookmarks.hidden).toBe(false);
    expect(bookmarks.shadowRoot?.querySelector<HTMLInputElement>('[aria-label="Bookmark name"]')?.value).toBe(item.name);
  });

  it.each([
    ['loadedmetadata', Number.NaN],
    ['durationchange', Number.NaN],
    ['durationchange', 20],
  ] as const)('shows saved markers when %s arrives after the library, without opening a control (initial duration: %s)', async (event, duration) => {
    tools?.cleanup();
    Object.defineProperty(video, 'duration', { value: duration, configurable: true });
    send.mockImplementation(async () => startupLibrary());
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    await vi.advanceTimersByTimeAsync(0);
    const track = loopEditorTrack();
    expect(track.querySelectorAll('.marker,.saved-range')).toHaveLength(0);
    Object.defineProperty(video, 'duration', { value: 100, configurable: true });
    video.dispatchEvent(new Event(event));
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.marker')).toHaveLength(1);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(1);
    expect(track.querySelector<HTMLElement>('.marker')?.style.left).toBe('45%');
    expect(track.querySelector<HTMLElement>('.saved-range')?.style.width).toBe('20%');
    expect(track.hidden).toBe(false);
    expect(track.classList.contains('editing')).toBe(false);
    expect(send.mock.calls.every(([message]) => ['list', 'claim'].includes(message.command.op))).toBe(true);
  });
  it('reloads saved markers after YouTube empties and reloads the same video during startup', async () => {
    tools?.cleanup();
    const pending: Array<(value: unknown) => void> = [];
    send.mockImplementation(({ command }) => command.op === 'list'
      ? new Promise(resolve => pending.push(resolve))
      : Promise.resolve({}));
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    await vi.advanceTimersByTimeAsync(0);
    video.dispatchEvent(new Event('emptied'));
    for (const resolve of pending.splice(0)) resolve(startupLibrary());
    await vi.advanceTimersByTimeAsync(0);
    expect(loopEditorTrack().querySelectorAll('.marker,.saved-range')).toHaveLength(0);
    send.mockImplementation(async () => startupLibrary());
    video.dispatchEvent(new Event('loadedmetadata'));
    await vi.advanceTimersByTimeAsync(0);
    expect(loopEditorTrack().querySelectorAll('.marker')).toHaveLength(1);
    expect(loopEditorTrack().querySelectorAll('.saved-range')).toHaveLength(1);
    expect(loopEditorTrack().hidden).toBe(false);
  });
  it('shows saved bookmarks immediately on videos without loop sections', async () => {
    tools?.cleanup();
    const stored = startupLibrary();
    stored.library.items = stored.library.items.filter(item => item.end === undefined);
    send.mockImplementation(async () => stored);
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    await vi.advanceTimersByTimeAsync(300);
    expect(loopEditorTrack().querySelectorAll('.marker')).toHaveLength(1);
    expect(loopEditorTrack().hidden).toBe(false);
  });
  it.each([true, false])('enables and plays a new section even when the previous section was enabled: %s', async (previousEnabled) => {
    findButton('Enable loop').click();
    if (!previousEnabled) findButton('Disable loop').click();
    video.currentTime = 15;
    video.play = vi.fn(async () => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
    });
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    loopPointer(track, 'pointerdown', 50, true);
    loopPointer(track, 'pointermove', 70, true);
    expect(video.currentTime).toBe(15);
    expect(video.play).not.toHaveBeenCalled();
    loopPointer(track, 'pointerup', 70, true);
    expect(video.currentTime).toBe(50);
    expect(video.paused).toBe(false);
    expect(video.play).toHaveBeenCalledOnce();
    expect(document.querySelector('.mfs-loop-button')?.getAttribute('aria-pressed')).toBe('true');
    expect(track.querySelectorAll('.saved-range')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(50);
  });
  it('starts the new section immediately without waiting for loop storage', () => {
    send.mockImplementation(({ command }) => command.op === 'replace-loops'
      ? new Promise(() => {})
      : Promise.resolve({ library: { version: 1, items: [] } }));
    video.play = vi.fn(async () => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
    });
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    loopPointer(track, 'pointerdown', 10);
    loopPointer(track, 'pointermove', 30);
    loopPointer(track, 'pointerup', 30);
    expect(video.currentTime).toBe(10);
    expect(video.paused).toBe(false);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({ op: 'replace-loops' }) }));
  });
  it.each(['pointercancel', 'click'])('does not seek or start playback for an unfinished section (%s)', (end) => {
    video.play = vi.fn(async () => {});
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    loopPointer(track, 'pointerdown', 10);
    if (end !== 'click') loopPointer(track, 'pointermove', 30);
    loopPointer(track, end === 'click' ? 'pointerup' : end, end === 'click' ? 10 : 30);
    expect(video.currentTime).toBe(25);
    expect(video.play).not.toHaveBeenCalled();
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
  });
  it.each([false, true])('finishes the first section if opening layout changes lose pointer capture (existing sections: %s)', async (existing) => {
    if (existing) {
      const previousTrack = await createMultipleSections();
      (previousTrack.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    }
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    loopPointer(track, 'pointerdown', 10);
    loopPointer(track, 'pointermove', 30);
    loopPointer(track, 'lostpointercapture', 30);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(false);
    loopPointer(document.documentElement, 'pointermove', 35);
    loopPointer(document.documentElement, 'pointerup', 35);
    await vi.advanceTimersByTimeAsync(0);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(10);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(35);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({ op: 'replace-loops', items: [expect.objectContaining({ start: 10, end: 35 })] }) }));
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
  });
  it.each(['blur', 'Escape'])('cancels an interrupted first drag on %s even after pointer capture is lost', async (action) => {
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    send.mockClear();
    loopPointer(track, 'pointerdown', 10);
    loopPointer(track, 'pointermove', 30);
    loopPointer(track, 'lostpointercapture', 30);
    if (action === 'blur') window.dispatchEvent(new Event('blur'));
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    loopPointer(document.documentElement, 'pointerup', 30);
    await vi.advanceTimersByTimeAsync(0);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
    expect(send.mock.calls.some(([message]) => ['put', 'replace-loops'].includes(message.command.op))).toBe(false);
  });
  it('does not restore stale saved sections when the initial library load arrives after a plain replacement', async () => {
    tools?.cleanup();
    const pending: Array<(value: unknown) => void> = [];
    send.mockImplementation(({ command }) => command.op === 'list'
      ? new Promise(resolve => pending.push(resolve))
      : Promise.resolve({}));
    tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
    root = (document.querySelector('.mfs-player-tools') as HTMLElement).shadowRoot as ShadowRoot;
    await vi.advanceTimersByTimeAsync(0);
    document.querySelector('.mfs-loop-button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    loopPointer(track, 'pointerdown', 60);
    loopPointer(track, 'pointermove', 80);
    loopPointer(track, 'pointerup', 80);
    const base = { mediaKey: 'youtube:test-video', url: document.location.href, title: 'Test', createdAt: 1 };
    for (const resolve of pending) resolve({ library: { version: 1, items: [
      { ...base, id: 'old-a', name: 'First', start: 10, end: 20 },
      { ...base, id: 'old-b', name: 'Second', start: 30, end: 40 },
      { ...base, id: 'saved-bookmark', name: 'Saved bookmark', start: 22 },
    ] } });
    await vi.advanceTimersByTimeAsync(0);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(60);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(80);
    expect(root.querySelector('.items')?.textContent).toContain('Saved bookmark');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ command: expect.objectContaining({ op: 'replace-loops', items: [expect.objectContaining({ start: 60, end: 80 })] }) }));
  });
  it('keeps a newly created section playing after earlier paused Live tune previews', () => {
    video.play = vi.fn(async () => {
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
    });
    video.pause = vi.fn(() => {
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
    });
    findButton('Enable loop').click();
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    (track.querySelector('.fine-tune-loop') as HTMLButtonElement).click();
    loopPointer(track.querySelector('.range .handle.end') as HTMLElement, 'pointerdown', 30);
    loopPointer(track, 'pointermove', 35);
    loopPointer(track, 'pointerup', 35);
    expect(video.paused).toBe(true);
    loopPointer(track, 'pointerdown', 50, true);
    loopPointer(track, 'pointermove', 70, true);
    loopPointer(track, 'pointerup', 70, true);
    expect(video.currentTime).toBe(50);
    expect(video.paused).toBe(false);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    expect(video.paused).toBe(false);
  });
  it('keeps paused handle adjustments paused and reports failed playback requests', async () => {
    findButton('Enable loop').click();
    findButton('Edit loop').click();
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    await vi.advanceTimersByTimeAsync(0);
    send.mockImplementation(({ command }) => command.op === 'put'
      ? new Promise(() => {})
      : Promise.resolve({ library: { version: 1, items: [] } }));
    video.play = vi.fn(async () => { throw new Error('Playback could not start.'); });
    loopPointer(track.querySelector('.range .handle.end') as HTMLElement, 'pointerdown', 30);
    loopPointer(track, 'pointermove', 35);
    loopPointer(track, 'pointerup', 35);
    expect(video.currentTime).toBe(25);
    expect(video.play).not.toHaveBeenCalled();
    loopPointer(track, 'pointerdown', 50, true);
    loopPointer(track, 'pointermove', 70, true);
    loopPointer(track, 'pointerup', 70, true);
    await vi.advanceTimersByTimeAsync(0);
    expect(video.currentTime).toBe(50);
    expect(video.play).toHaveBeenCalledOnce();
    expect(root.querySelector('.status')?.textContent).toBe('Playback could not start.');
  });
  it('hides bookmarks during loop editing and enables the containing section without restarting playback', async () => {
    const base = { mediaKey: 'youtube:test-video', url: document.location.href, title: 'Test', createdAt: 1 };
    const sections = [
      { ...base, id: 'first', name: 'First', start: 10, end: 20 },
      { ...base, id: 'second', name: 'Second', start: 30, end: 50 },
      { ...base, id: 'bookmark', name: 'Bookmark', start: 25 },
    ];
    send.mockImplementation(async ({ command }) => command.op === 'list'
      ? { library: { version: 1, items: sections } } : {});
    const toggle = document.querySelector<HTMLButtonElement>('.mfs-loop-button');
    if (!toggle) throw new Error('Loop controls missing');
    toggle.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true})); await vi.advanceTimersByTimeAsync(0);
    const track = document.querySelector('.mfs-loop-surface')?.shadowRoot;
    expect(track?.querySelector('.marker')).toBeNull();
    expect(track?.querySelectorAll('.saved-range .handle')).toHaveLength(4);
    video.currentTime = 40;
    toggle.click();
    expect(video.currentTime).toBe(40);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(30);
    toggle.click(); video.currentTime = 45; toggle.click();
    expect(video.currentTime).toBe(45);
    toggle.click(); video.currentTime = 80; toggle.click();
    expect(video.currentTime).toBe(30);
  });
  it('adds from the player, edits the same saved bookmark, and exits on preference changes and navigation', async () => {
    const bookmark = document.querySelector<HTMLButtonElement>('.mfs-bookmarks-button');
    if (!bookmark) throw new Error('Bookmark button missing');
    bookmark.click(); await vi.advanceTimersByTimeAsync(0);
    const saved = send.mock.calls.find(([message]) => message.command.op === 'put')?.[0].command.item;
    expect(saved).toMatchObject({name:'Moment 0:25',start:25});
    expect(saved.end).toBeUndefined();
    send.mockClear();
    bookmark.dispatchEvent(new MouseEvent('pointerdown',{button:0,bubbles:true}));
    await vi.advanceTimersByTimeAsync(600);
    bookmark.dispatchEvent(new Event('pointerup',{bubbles:true}));bookmark.click();
    expect(send.mock.calls.filter(([message])=>message.command.op==='put')).toHaveLength(0);
    const editor=document.querySelector('.mfs-youtube-bookmarks-editor') as HTMLElement;
    expect(editor.hidden).toBe(false);
    expect(bookmark.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-editing')).toBe('true');
    const name=editor.shadowRoot?.querySelector<HTMLInputElement>('input[aria-label="Bookmark name"]');
    if (!name) throw new Error('Bookmark name missing');
    name.value='Introduction';name.dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({command:{op:'put',item:expect.objectContaining({id:saved.id,name:'Introduction',start:25,createdAt:saved.createdAt})}}));
    const listener=changed.addListener.mock.calls.at(-1)?.[0];
    listener({playerTools:{newValue:{...DEFAULT_PLAYER_TOOLS,youtubeBookmarksEnabled:false}}},'sync');
    expect(editor.hidden).toBe(true);expect(bookmark.isConnected).toBe(false);
    listener({playerTools:{newValue:DEFAULT_PLAYER_TOOLS}},'sync');
    bookmark.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:true,bubbles:true}));
    expect(editor.hidden).toBe(false);
    document.dispatchEvent(new Event('yt-navigate-start'));
    expect(editor.hidden).toBe(true);
  });
  it('reports failed bookmark creation and does not add an unsaved marker', async () => {
    send.mockImplementation(async ({command}) => command.op==='put' ? {error:'Storage unavailable'} : {library:{version:1,items:[]}});
    document.querySelector<HTMLButtonElement>('.mfs-bookmarks-button')?.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector('.mfs-youtube-bookmarks')?.textContent).toContain('Could not save bookmark');
    expect(root.querySelector('.items')?.textContent).not.toContain('Moment 0:25');
  });
  it('keeps bookmark editing open when the opening hold releases outside the repositioned button', async () => {
    const bookmark = document.querySelector<HTMLButtonElement>('.mfs-bookmarks-button');
    if (!bookmark) throw new Error('Bookmark button missing');
    const clicked = vi.fn();
    video.addEventListener('click', clicked);
    send.mockClear();
    bookmark.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    await vi.advanceTimersByTimeAsync(600);
    const editor = document.querySelector('.mfs-youtube-bookmarks-editor') as HTMLElement;
    expect(bookmark.getAttribute('aria-expanded')).toBe('true');
    for (const type of ['pointerup', 'mouseup', 'click']) {
      video.dispatchEvent(new MouseEvent(type, { button: 0, bubbles: true, cancelable: true }));
    }
    await vi.advanceTimersByTimeAsync(300);
    expect(editor.hidden).toBe(false);
    expect(bookmark.getAttribute('aria-expanded')).toBe('true');
    expect(clicked).not.toHaveBeenCalled();
    expect(send.mock.calls.filter(([message]) => message.command.op === 'put')).toHaveLength(0);
    video.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    video.click();
    await vi.advanceTimersByTimeAsync(240);
    expect(editor.hidden).toBe(true);
    expect(clicked).not.toHaveBeenCalled();
  });
  it('persists dragged bookmarks as valid library entries and reports storage errors without losing the saved point', async () => {
    const bookmark = document.querySelector('.mfs-bookmarks-button') as HTMLButtonElement;
    bookmark.click();
    await vi.advanceTimersByTimeAsync(0);
    bookmark.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', shiftKey: true, bubbles: true}));
    const editor = document.querySelector('.mfs-youtube-bookmarks-editor')?.shadowRoot;
    if (!editor) throw new Error('Bookmark editor missing');
    const pointer = (target: EventTarget, type: string, x: number) => {
      const event = new MouseEvent(type, {clientX: x, button: 0, bubbles: true, composed: true});
      Object.defineProperty(event, 'pointerId', {value: 1});
      target.dispatchEvent(event);
    };
    send.mockClear();
    send.mockImplementation(async ({command}) => {
      if (command.op === 'put' && !validMoment(command.item)) return {error: 'Invalid saved moment.'};
      return {};
    });
    pointer(editor.querySelector('.point') as HTMLElement, 'pointerdown', 160);
    pointer(document, 'pointermove', 320);
    pointer(document, 'pointerup', 320);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({command: {op: 'put', item: expect.objectContaining({start: 50})}}));
    expect(editor.querySelector('.point')?.getAttribute('style')).toContain('50%');
    send.mockResolvedValueOnce({error: 'Storage quota exceeded.'});
    pointer(editor.querySelector('.point') as HTMLElement, 'pointerdown', 320);
    pointer(document, 'pointermove', 480);
    pointer(document, 'pointerup', 480);
    await vi.advanceTimersByTimeAsync(0);
    expect(editor.querySelector('.point')?.getAttribute('style')).toContain('50%');
    expect(editor.querySelector('[role=status]')?.textContent).toContain('Storage quota exceeded.');
  });
  it('keeps the live Settings slider preview active until release, without modifying saved dimming', async () => {
    const listener = changed.addListener.mock.calls.at(-1)?.[0];
    const update = (active: boolean, dimming = 35, owner = 'settings-slider') =>
      listener({[CINEMA_PREVIEW_KEY]: {newValue: {active, dimming, owner}}}, 'local');
    const cinema = document.querySelector('.mfs-cinema-button') as HTMLButtonElement;
    update(true);
    expect(root.querySelector<HTMLElement>('.shade')?.style.opacity).toBe('0.35');
    for (let second = 0; second < 5; second++) {
      await vi.advanceTimersByTimeAsync(1000);
      update(true);
    }
    expect(root.querySelector<HTMLElement>('.shade')?.style.opacity).toBe('0.35');
    update(false, 35, 'another-settings-window');
    await vi.advanceTimersByTimeAsync(1900);
    expect(root.querySelector<HTMLElement>('.shade')?.style.opacity).toBe('0.35');
    update(false);
    await vi.advanceTimersByTimeAsync(2100);
    expect(root.querySelector('.shade')).toBeNull();
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    cinema.click();
    expect(root.querySelector<HTMLElement>('.shade')?.style.opacity).toBe('0.9');
  });
  it('recovers an abandoned Settings slider preview and ignores invalid preview messages', async () => {
    const listener = changed.addListener.mock.calls.at(-1)?.[0];
    listener({[CINEMA_PREVIEW_KEY]: {newValue: {active: true, dimming: NaN, owner: 'settings'}}}, 'local');
    expect(root.querySelector('.shade')).toBeNull();
    listener({[CINEMA_PREVIEW_KEY]: {newValue: {active: true, dimming: 25, owner: 'settings'}}}, 'local');
    await vi.advanceTimersByTimeAsync(6100);
    expect(root.querySelector('.shade')).toBeNull();
  });
  it('briefly previews Cinema preference changes without enabling it, restarts the timer, and preserves active Cinema', async () => {
    const listener = changed.addListener.mock.calls.at(-1)?.[0];
    const cinema = document.querySelector('.mfs-cinema-button') as HTMLButtonElement;
    const update = (color: string) => listener({playerTools: {newValue: {...DEFAULT_PLAYER_TOOLS, cinemaColor: color}}}, 'sync');
    update('#172554');
    expect(root.querySelector('.shade path')?.getAttribute('fill')).toBe('#172554');
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    await vi.advanceTimersByTimeAsync(1000);
    update('#abcdef');
    await vi.advanceTimersByTimeAsync(1000);
    expect((root.querySelector('.shade') as HTMLElement)?.style.opacity).toBe('0.9');
    await vi.advanceTimersByTimeAsync(1100);
    expect(root.querySelector('.shade')).toBeNull();
    cinema.click();
    update('#000000');
    await vi.advanceTimersByTimeAsync(2100);
    expect(root.querySelector('.shade')).not.toBeNull();
    expect(cinema.getAttribute('aria-pressed')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    await vi.advanceTimersByTimeAsync(250);
    expect(root.querySelector('.shade')).toBeNull();
  });
  it('starts Cinema inactive and supports button, Escape, backdrop and PiP exit paths', async () => {
    const cinema = document.querySelector(
      '.mfs-cinema-button'
    ) as HTMLButtonElement;
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('.shade')).toBeNull();
    expect(root.textContent).not.toContain('Cinema mode');
    expect(root.textContent).not.toContain('Cinema dimming (%)');
    cinema.click();
    expect(cinema.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.shade')).toHaveLength(1);
    expect((root.querySelector('.shade') as HTMLElement).style.opacity).toBe(
      '0.9'
    );
    cinema.click();
    expect((root.querySelector('.shade') as HTMLElement).style.opacity).toBe('0');
    await vi.advanceTimersByTimeAsync(240);
    expect(root.querySelector('.shade')).toBeNull();
    cinema.click();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    await vi.advanceTimersByTimeAsync(240);
    expect(root.querySelector('.shade')).toBeNull();
    cinema.click();
    root.querySelector('.shade path')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    cinema.click();
    video.dispatchEvent(new Event('enterpictureinpicture'));
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
    await vi.advanceTimersByTimeAsync(240);
    expect(root.querySelector('.shade')).toBeNull();
  });
  it('exits Cinema when its button is removed, and applies saved dimming', async () => {
    const cinema = document.querySelector(
      '.mfs-cinema-button'
    ) as HTMLButtonElement;
    const storage = changed.addListener.mock.calls.at(-1)?.[0];
    storage(
      { playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, dimming: 65, cinemaColor: '#172554' } } },
      'sync'
    );
    cinema.click();
    expect((root.querySelector('.shade') as HTMLElement).style.opacity).toBe(
      '0.65'
    );
    expect(root.querySelector('.shade path')?.getAttribute('fill')).toBe('#172554');
    storage(
      {
        playerTools: {
          newValue: {
            ...DEFAULT_PLAYER_TOOLS,
            youtubeCinemaEnabled: false,
            dimming: 65,
          },
        },
      },
      'sync'
    );
    await vi.advanceTimersByTimeAsync(240);
    expect(root.querySelector('.shade')).toBeNull();
    expect(document.querySelector('.mfs-cinema-button')).toBeNull();
    expect(document.querySelector('.mfs-info-cards-button')).not.toBeNull();
    cinema.click();
    expect(root.querySelector('.shade')).toBeNull();
    storage({ playerTools: { newValue: DEFAULT_PLAYER_TOOLS } }, 'sync');
    expect(cinema.getAttribute('aria-pressed')).toBe('false');
  });
  it('restores YouTube recommendations when disabled and remembers the player choice when re-enabled', async () => {
    const cards = document.querySelector(
      '.mfs-info-cards-button'
    ) as HTMLButtonElement;
    const player = video.closest('#movie_player') as HTMLElement;
    expect(player.dataset.mfsHideEndScreens).toBe('false');
    expect(cards.getAttribute('aria-pressed')).toBe('true');
    cards.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(player.dataset.mfsHideEndScreens).toBe('true');
    expect(player.dataset.mfsHideCards).toBe('false');
    expect(cards.getAttribute('aria-pressed')).toBe('false');
    expect(cards.nextElementSibling?.querySelector('.mfs-tooltip-label')?.textContent).toBe('End-screen cards: hidden');
    expect(cards.nextElementSibling?.querySelector('.ytp-tooltip-keyboard-shortcut')?.textContent).toBe('E');
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      playerTools: expect.objectContaining({
        hideEndScreens: true,
        youtubeInfoCardsEnabled: true,
      }),
    });
    const storage = changed.addListener.mock.calls.at(-1)?.[0];
    storage(
      {
        playerTools: {
          newValue: {
            ...DEFAULT_PLAYER_TOOLS,
            youtubeInfoCardsEnabled: false,
            hideEndScreens: true,
          },
        },
      },
      'sync'
    );
    expect(document.querySelector('.mfs-info-cards-button')).toBeNull();
    expect(player.dataset.mfsHideEndScreens).toBe('false');
    const writes = vi.mocked(chrome.storage.sync.set).mock.calls.length;
    cards.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(writes);
    expect(player.dataset.mfsHideEndScreens).toBe('false');
    storage(
      {
        playerTools: {
          newValue: { ...DEFAULT_PLAYER_TOOLS, hideEndScreens: true },
        },
      },
      'sync'
    );
    expect(player.dataset.mfsHideEndScreens).toBe('true');
    expect(cards.getAttribute('aria-pressed')).toBe('false');
    cards.click();
    expect(player.dataset.mfsHideEndScreens).toBe('false');
    expect(cards.getAttribute('aria-pressed')).toBe('true');
  });
  it.each([
    { enabled: false, hidden: false },
    { enabled: false, hidden: true },
    { enabled: true, hidden: false },
    { enabled: true, hidden: true },
  ])('loads the saved end-screen choice without hiding cards when disabled (enabled: $enabled, hidden: $hidden)', async ({ enabled, hidden }) => {
    tools?.cleanup();
    vi.mocked(chrome.storage.sync.get).mockImplementationOnce(async () => ({
      playerTools: {
        ...DEFAULT_PLAYER_TOOLS,
        youtubeInfoCardsEnabled: enabled,
        hideEndScreens: hidden,
      },
    }));
    tools = new PlayerTools(
      video,
      document.querySelector('#timeline') as HTMLElement
    );
    await vi.advanceTimersByTimeAsync(0);
    const player = video.closest('#movie_player') as HTMLElement;
    expect(player.dataset.mfsHideEndScreens).toBe(String(enabled && hidden));
    const button = document.querySelector('.mfs-info-cards-button');
    if (enabled) {
      expect(button?.getAttribute('aria-pressed')).toBe(String(!hidden));
    } else {
      expect(button).toBeNull();
    }
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
  });
  it('keeps both new buttons unavailable during ads and removes them and shades on cleanup', async () => {
    const cinema = document.querySelector(
      '.mfs-cinema-button'
    ) as HTMLButtonElement;
    const cards = document.querySelector(
      '.mfs-info-cards-button'
    ) as HTMLButtonElement;
    video.parentElement?.classList.add('ad-showing');
    await vi.advanceTimersByTimeAsync(350);
    expect(cinema.disabled).toBe(true);
    expect(cards.disabled).toBe(true);
    cinema.click();
    cards.click();
    expect(root.querySelector('.shade')).toBeNull();
    expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    video.parentElement?.classList.remove('ad-showing');
    await vi.advanceTimersByTimeAsync(350);
    expect(cinema.disabled).toBe(false);
    expect(cards.disabled).toBe(false);
    cinema.click();
    tools?.cleanup();
    expect(document.querySelector('.mfs-youtube-controls')).toBeNull();
    expect(document.querySelector('.mfs-player-tools')).toBeNull();
    expect(
      video.parentElement?.getAttribute('data-mfs-hide-end-screens')
    ).toBeNull();
  });
  it('reports storage errors from the End-screen cards player action', async () => {
    vi.mocked(chrome.storage.sync.set).mockRejectedValueOnce(
      new Error('Storage unavailable')
    );
    (
      document.querySelector('.mfs-info-cards-button') as HTMLButtonElement
    ).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector('.status')?.textContent).toBe(
      'Storage unavailable'
    );
  });
  it('opens Loop from the native control container and removes it when disabled', async () => {
    const native = document.querySelector(
      '.mfs-loop-button'
    ) as HTMLButtonElement;
    expect(native).not.toBeNull();
    expect(native.closest('.mfs-youtube-controls')?.nextElementSibling?.className).toBe(
      'ytp-autonav-toggle'
    );
    expect(
      root.querySelector('[aria-label="Video tools"].panel')?.textContent
    ).not.toContain('Edit loop');
    native.click();
    expect((root.querySelector('[role="dialog"]') as HTMLElement).hidden).toBe(
      true
    );
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-editing')).toBe('true');
    expect(document.querySelector('.mfs-youtube-buttons .mfs-tooltip-label')?.textContent).toBe('Loop Sections');
    findButton('Enable loop').click();
    const storage = changed.addListener.mock.calls.at(-1)?.[0];
    storage(
      {
        playerTools: {
          newValue: { ...DEFAULT_PLAYER_TOOLS, youtubeLoop: false },
        },
      },
      'sync'
    );
    expect(document.querySelector('.mfs-youtube-buttons')).toBeNull();
    expect(
      root.querySelector('[role="dialog"]')?.getAttribute('aria-hidden')
    ).toBe('true');
    expect(findButton('Enable loop').disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(350);
    expect(document.querySelector('.mfs-youtube-buttons')).toBeNull();
  });
  it.each(['button', 'Escape'])('animates loop closing via %s and can reopen before it finishes', async (method) => {
    const button = document.querySelector('.mfs-loop-button') as HTMLButtonElement;
    button.click();
    const track = document.querySelector('.mfs-loop-surface')?.shadowRoot?.querySelector('.timeline') as HTMLElement;
    if (method === 'button') (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(track.classList.contains('editing')).toBe(false);
    expect(track.classList.contains('closing')).toBe(true);
    expect(track.hidden).toBe(false);
    expect((track.querySelector('.loop-editor-actions') as HTMLElement).inert).toBe(true);
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-closing')).toBe('true');
    await vi.advanceTimersByTimeAsync(120);
    button.click();
    expect(track.classList.contains('closing')).toBe(false);
    expect(track.classList.contains('editing')).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(track.classList.contains('editing')).toBe(true);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(240);
    expect(track.classList.contains('closing')).toBe(false);
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-closing')).toBe('false');
  });
  it('consumes Escape before page keyboard suspension can cancel the closing animation', async () => {
    const timeline = document.querySelector('#timeline') as HTMLElement;
    const suspend = vi.fn(() => {
      delete timeline.dataset.mfsLoopAnimating;
      timeline.style.display = 'none';
    });
    document.addEventListener('keydown', suspend);
    try {
      (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
      const dismissKey = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
      document.dispatchEvent(dismissKey);
      expect(dismissKey.defaultPrevented).toBe(true);
      expect(suspend).not.toHaveBeenCalled();
      expect(timeline.dataset.mfsLoopClosing).toBe('true');
      expect(timeline.dataset.mfsLoopAnimating).toBe('true');
      await vi.advanceTimersByTimeAsync(120);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, repeat: true }));
      expect(suspend).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(120);
      expect(timeline.dataset.mfsLoopClosing).toBe('false');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(suspend).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener('keydown', suspend);
    }
  });
  it('closes immediately when reduced motion is requested and cleans up during a closing animation', () => {
    const media = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', media);
    const button = document.querySelector('.mfs-loop-button') as HTMLButtonElement;
    button.click();
    const track = document.querySelector('.mfs-loop-surface')?.shadowRoot?.querySelector('.timeline') as HTMLElement;
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    expect(track.classList.contains('closing')).toBe(false);
    media.mockReturnValue({ matches: false } as MediaQueryList);
    button.click();
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    expect(track.classList.contains('closing')).toBe(true);
    tools?.cleanup();
    expect(document.querySelector('#timeline')?.hasAttribute('data-mfs-loop-closing')).toBe(false);
    expect(document.querySelector('.mfs-loop-surface')).toBeNull();
    vi.unstubAllGlobals();
  });
  it('separates playback from editing and retains collapsed sections', async () => {
    const native = document.querySelector('.mfs-loop-button') as HTMLButtonElement;
    native.click();
    expect(document.querySelector('#timeline')?.getAttribute('data-mfs-loop-editing')).toBe('true');
    const track = document.querySelector('.mfs-loop-surface')!.shadowRoot!.querySelector('.timeline') as HTMLElement;
    track.getBoundingClientRect = video.getBoundingClientRect;
    for (const [type, x] of [['pointerdown', 64], ['pointermove', 192], ['pointerup', 192]] as const) {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      track.dispatchEvent(event);
    }
    expect(native.getAttribute('aria-pressed')).toBe('true');
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(track.classList.contains('editing')).toBe(true);
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    expect(track.classList.contains('editing')).toBe(false);
    expect(track.hidden).toBe(false);
    video.currentTime = 20;
    (track.querySelector('.range') as HTMLElement).click();
    expect(video.currentTime).toBe(10);
    expect(native.getAttribute('aria-pressed')).toBe('true');
    native.click();
    expect(native.getAttribute('aria-pressed')).toBe('false');
    expect(track.dataset.loopEnabled).toBe('false');
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true}));
    expect(track.classList.contains('editing')).toBe(true);
    expect(native.getAttribute('aria-pressed')).toBe('false');
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    native.click();
    expect(native.getAttribute('aria-pressed')).toBe('true');
    expect(track.classList.contains('editing')).toBe(false);
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true}));
    (track.querySelector('.clear-loop-sections') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(track.classList.contains('editing')).toBe(true);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(0);
    expect(native.getAttribute('aria-pressed')).toBe('false');
    (track.querySelector('.undo-loop-sections') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(false);
    expect(inputFor('A (seconds)').value).toBe('10.0');
    (track.querySelector('.redo-loop-sections') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
  });
  it('shows Close until edited and discards changes back to the opening sections', async () => {
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
    const track = document.querySelector('.mfs-loop-surface')!.shadowRoot!.querySelector('.timeline') as HTMLElement;
    const done = track.querySelector('.close-loop-editor') as HTMLButtonElement;
    const discard = track.querySelector('.discard-loop-edits') as HTMLButtonElement;
    expect(done.textContent).toBe('Close');
    expect(discard.disabled).toBe(true);
    findButton('Enable loop').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(done.textContent).toBe('✓ Done editing');
    expect(discard.disabled).toBe(false);
    discard.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(track.classList.contains('editing')).toBe(false);
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
    expect(send.mock.calls.some(([message]) => message.command.op === 'delete')).toBe(true);
  });
  it('places configured volume boost before Loop and supports boost without Loop', () => {
    const storage = changed.addListener.mock.calls.at(-1)?.[0];
    storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, youtubeLoop: true, youtubeBoostEnabled: true, youtubeBoost: 4 } } }, 'sync');
    const boost = document.querySelector('.mfs-youtube-boost') as HTMLElement;
    expect(boost.nextElementSibling?.className).toBe('mfs-youtube-cinema');
    expect(boost.nextElementSibling?.nextElementSibling?.className).toBe('mfs-youtube-buttons');
    expect(boost.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
    expect(boost.textContent).toContain('4×');
    expect(root.textContent).not.toContain('Extra volume (%)');
    storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, youtubeLoop: false, youtubeBoostEnabled: true, youtubeBoost: 10 } } }, 'sync');
    expect(document.querySelector('.mfs-youtube-buttons')).toBeNull();
    expect(document.querySelector('.mfs-youtube-boost')?.textContent).toContain('5×');
    storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, youtubeBoostEnabled: false } } }, 'sync');
    expect(document.querySelector('.mfs-youtube-boost')).toBeNull();
  });
  it('reattaches a single button container after YouTube replaces its controls', async () => {
    const controls = document.querySelector(
      '.ytp-right-controls'
    ) as HTMLElement;
    controls.innerHTML = '<button class="ytp-subtitles-button"></button>';
    await vi.advanceTimersByTimeAsync(350);
    expect(controls.querySelectorAll('.mfs-youtube-buttons')).toHaveLength(1);
    expect(controls.firstElementChild?.className).toBe('mfs-youtube-controls');
    tools?.cleanup();
    expect(controls.querySelector('.mfs-youtube-buttons')).toBeNull();
  });
  it.each([true, false])('overrides J/L and arrow seeking independently on YouTube: %s', async (youtube) => {
    tools?.cleanup();
    const hostname = vi.spyOn(youtubeChapters, 'isYouTubeHostname').mockReturnValue(youtube);
    try {
      tools = new PlayerTools(video, document.querySelector('#timeline') as HTMLElement);
      await vi.advanceTimersByTimeAsync(0);
      const storage = changed.addListener.mock.calls.at(-1)?.[0];
      const key = (key: string) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        video.dispatchEvent(event);
        return event;
      };
      expect(key('j').defaultPrevented).toBe(true);
      expect(video.currentTime).toBe(15);
      expect(key('l').defaultPrevented).toBe(true);
      expect(video.currentTime).toBe(25);
      storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, jlKeysEnabled: false } } }, 'sync');
      expect(key('j').defaultPrevented).toBe(false);
      expect(video.currentTime).toBe(25);
      expect(key('ArrowRight').defaultPrevented).toBe(true);
      expect(video.currentTime).toBe(30);
      storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, arrowKeysEnabled: false } } }, 'sync');
      expect(key('ArrowLeft').defaultPrevented).toBe(false);
      expect(key('j').defaultPrevented).toBe(true);
      expect(video.currentTime).toBe(20);
      storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, arrowKeySeekingEnabled: false } } }, 'sync');
      expect(key('j').defaultPrevented).toBe(false);
      expect(key('ArrowRight').defaultPrevented).toBe(false);
    } finally { hostname.mockRestore(); }
  });

  it('leaves arrow keys to the site while disabled and resumes after a live settings change', () => {
    const storage = changed.addListener.mock.calls.at(-1)?.[0];
    storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, arrowKeySeekingEnabled: false } } }, 'sync');
    const native = vi.fn();
    video.addEventListener('keydown', native);
    const right = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    video.dispatchEvent(right);
    expect(video.currentTime).toBe(25);
    expect(right.defaultPrevented).toBe(false);
    expect(native).toHaveBeenCalledOnce();
    storage({ playerTools: { newValue: { ...DEFAULT_PLAYER_TOOLS, arrowKeySeekingEnabled: true } } }, 'sync');
    video.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    expect(video.currentTime).toBe(20);
    expect(native).toHaveBeenCalledOnce();
  });
  it('prevents a native key handler from seeking a second time and preserves modifier keys', () => {
    const native = vi.fn();
    video.addEventListener('keydown', native);
    video.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(video.currentTime).toBe(35);
    expect(native).not.toHaveBeenCalled();
    video.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(video.currentTime).toBe(35);
    expect(native).toHaveBeenCalledOnce();
  });
  it('disables loop editing for live DVR players with a finite duration', async () => {
    video.parentElement?.classList.add('ytp-live');
    await vi.advanceTimersByTimeAsync(350);
    expect(findButton('Edit loop').disabled).toBe(true);
    expect(findButton('Enable loop').disabled).toBe(true);
  });
  it('updates a saved section after editing its range instead of creating duplicates', async () => {
    findButton('Enable loop').click();
    findButton('Save changes').click();
    await vi.advanceTimersByTimeAsync(0);
    const end = inputFor('B (seconds)');
    end.value = '40';
    end.dispatchEvent(new Event('change'));
    findButton('Save changes').click();
    await vi.advanceTimersByTimeAsync(0);
    const saved = send.mock.calls
      .filter(([message]) => message.command.op === 'put')
      .map(([message]) => message.command.item);
    expect(saved.length).toBeGreaterThanOrEqual(2);
    expect(new Set(saved.map((item) => item.id)).size).toBe(1);
    expect(saved.at(-1).end).toBe(40);
  });
  it('uses custom skip values and displays remaining time at actual speed', () => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(video.currentTime).toBe(15);
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(video.currentTime).toBe(25);
    expect(root.textContent).not.toContain('Skip intervals');
    expect(
      [...root.querySelectorAll('button')].some(
        (button) => button.textContent === 'Rewind'
      )
    ).toBe(false);
    video.playbackRate = 2;
    video.dispatchEvent(new Event('ratechange'));
    expect(root.textContent).toContain('0:37 remaining at 2×');
  });
  it('leaves normal timeline gestures alone and cycles created sections in order', async () => {
    video.play = vi.fn(async () => {});
    const track = document.querySelector('.mfs-loop-surface')!.shadowRoot!.querySelector('.timeline') as HTMLElement;
    track.getBoundingClientRect = video.getBoundingClientRect;
    const pointer = (type: string, x: number, shiftKey = false) => {
      const e = new MouseEvent(type, { bubbles: true, clientX: x, button: 0, shiftKey });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      track.dispatchEvent(e);
    };
    pointer('pointerdown', 64);
    pointer('pointermove', 192);
    pointer('pointerup', 192);
    expect(inputFor('A (seconds)').value).toBe('0');
    findButton('Edit loop').click();
    pointer('pointerdown', 64);
    pointer('pointermove', 192);
    pointer('pointerup', 192);
    expect(inputFor('A (seconds)').value).toBe('10.0');
    expect(inputFor('B (seconds)').value).toBe('30.0');
    expect(video.currentTime).toBe(10);
    pointer('pointerdown', 320, true);
    pointer('pointermove', 448, true);
    pointer('pointerup', 448, true);
    expect(track.querySelectorAll('.saved-range')).toHaveLength(1);
    expect(track.querySelectorAll('.time-pill')).toHaveLength(4);
    expect(inputFor('A (seconds)').value).toBe('50.0');
    expect(inputFor('B (seconds)').value).toBe('70.0');
    pointer('pointerdown', 384, true);
    pointer('pointermove', 500, true);
    pointer('pointerup', 500, true);
    expect(inputFor('B (seconds)').value).toBe('70.0');
    expect(track.querySelectorAll('.saved-range')).toHaveLength(1);

    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 25;
    const savedHandle = track.querySelector('.saved-range .handle.end') as HTMLElement;
    const grab = new MouseEvent('pointerdown', { bubbles: true, clientX: 192, button: 0 });
    Object.defineProperty(grab, 'pointerId', { value: 1 });
    savedHandle.dispatchEvent(grab);
    expect(video.currentTime).toBe(25);
    pointer('pointermove', 192);
    pointer('pointerup', 192);
    expect(video.currentTime).toBe(25);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(track.classList.contains('editing')).toBe(false);
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 30;
    video.dispatchEvent(new Event('timeupdate'));
    await vi.advanceTimersByTimeAsync(20);
    expect(video.currentTime).toBe(50);
    video.currentTime = 70;
    video.dispatchEvent(new Event('timeupdate'));
    await vi.advanceTimersByTimeAsync(20);
    expect(video.currentTime).toBe(10);

  });
  it('keeps playing within dragged boundaries as each handle crosses the playhead', () => {
    findButton('Enable loop').click();
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true}));
    const track = document.querySelector('.mfs-loop-surface')!.shadowRoot!.querySelector('.timeline') as HTMLElement;
    track.getBoundingClientRect = video.getBoundingClientRect;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 27;
    const pointer = (target: Element, type: string, time: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: time * 6.4, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      target.dispatchEvent(event);
    };
    pointer(track.querySelector('.range .handle.start')!, 'pointerdown', 25);
    pointer(track, 'pointermove', 26);
    expect(video.currentTime).toBe(27);
    pointer(track, 'pointermove', 28);
    expect(video.currentTime).toBeCloseTo(28);
    pointer(track, 'pointermove', 29);
    expect(video.currentTime).toBeCloseTo(29);
    pointer(track, 'pointerup', 29);
    video.currentTime = 29.8;
    pointer(track.querySelector('.range .handle.end')!, 'pointerdown', 30);
    pointer(track, 'pointermove', 29.5);
    expect(video.currentTime).toBeCloseTo(29);
    expect(video.paused).toBe(false);
    pointer(track, 'pointermove', 10);
    expect(Number(inputFor('B (seconds)').value)).toBeGreaterThan(Number(inputFor('A (seconds)').value));
    pointer(track, 'pointerup', 10);
    (track.querySelector('.range .delete-loop-section') as HTMLButtonElement).click();
    expect((track.querySelector('.range') as HTMLElement).hidden).toBe(true);
  });
  it.each([
    [true, 'button'], [false, 'button'], [true, 'Alt'], [false, 'Alt'],
  ] as const)('restores pre-drag playback on editing exit (playing: %s, Live tune: %s)', async (wasPlaying, activation) => {
    findButton('Enable loop').click();
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true}));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    video.play = vi.fn(async () => { Object.defineProperty(video, 'paused', { value: false, configurable: true }); });
    video.pause = vi.fn(() => { Object.defineProperty(video, 'paused', { value: true, configurable: true }); });
    Object.defineProperty(video, 'paused', { value: !wasPlaying, configurable: true });
    const liveTune = track.querySelector('.fine-tune-loop') as HTMLButtonElement;
    expect(liveTune.textContent).toBe('Live tune');
    if (activation === 'button') liveTune.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
    expect(liveTune.getAttribute('aria-pressed')).toBe('true');
    expect(track.querySelector('.loop-edit-hint')?.textContent).toContain('Live tune');
    const pointer = (target: Element, type: string, time: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: time * 6.4, button: 0, altKey: activation === 'Alt' });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      target.dispatchEvent(event);
    };
    pointer(track.querySelector('.range .handle.end') as HTMLElement, 'pointerdown', 30);
    expect(video.paused).toBe(false);
    pointer(track, 'pointermove', 40);
    expect(video.currentTime).toBe(40);
    expect(video.paused).toBe(false);
    await vi.advanceTimersByTimeAsync(180);
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(40);
    pointer(track, 'pointerup', 40);
    expect(video.pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(25);
    expect(video.paused).toBe(true);
    if (activation === 'Alt') {
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
      expect(liveTune.getAttribute('aria-pressed')).toBe('false');
    }
    (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    expect(video.paused).toBe(!wasPlaying);
  });
  it('puts editing tools to the left of the finish actions in their own pill', () => {
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
    const track = loopEditorRoot();
    const pills = [...track.querySelectorAll('.loop-actions-pill')];
    expect(pills).toHaveLength(2);
    const [toolPill, finishPill] = pills;
    if (!toolPill || !finishPill) throw new Error('Loop action pills missing');
    expect([...toolPill.querySelectorAll('button')].map(button => button.textContent))
      .toEqual(['Undo', 'Redo', 'Live tune', 'Clear']);
    expect([...finishPill.querySelectorAll('button')].map(button => button.textContent))
      .toEqual(['Discard changes', 'Close']);
  });
  it.each(['keyup', 'blur', 'close', 'navigation'])('releases temporary Live tune on %s', (end) => {
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
    const track = loopEditorTrack();
    const liveTune = track.querySelector('.fine-tune-loop') as HTMLButtonElement;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
    expect(liveTune.getAttribute('aria-pressed')).toBe('true');
    expect(track.dataset.fineTune).toBe('true');
    if (end === 'keyup') document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    else if (end === 'blur') window.dispatchEvent(new Event('blur'));
    else if (end === 'close') (track.querySelector('.close-loop-editor') as HTMLButtonElement).click();
    else document.dispatchEvent(new Event('yt-navigate-start'));
    expect(liveTune.getAttribute('aria-pressed')).toBe('false');
    expect(track.dataset.fineTune).toBe('false');
    expect(track.querySelector('.loop-edit-hint')?.textContent).toContain('Shift');
  });
  it('keeps the button enabled after releasing Alt if Live tune was toggled on', () => {
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).click();
    const track = loopEditorRoot();
    const liveTune = track.querySelector('.fine-tune-loop') as HTMLButtonElement;
    liveTune.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    expect(liveTune.getAttribute('aria-pressed')).toBe('true');
  });
  it('can enter and leave Live tune in the middle of a handle drag without losing the original playback position', async () => {
    findButton('Enable loop').click();
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    const track = loopEditorTrack();
    track.getBoundingClientRect = video.getBoundingClientRect;
    video.play = vi.fn(async () => { Object.defineProperty(video, 'paused', { value: false, configurable: true }); });
    video.pause = vi.fn(() => { Object.defineProperty(video, 'paused', { value: true, configurable: true }); });
    const pointer = (target: Element, type: string, time: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: time * 6.4, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      target.dispatchEvent(event);
    };
    pointer(track.querySelector('.range .handle.end') as HTMLElement, 'pointerdown', 30);
    pointer(track, 'pointermove', 35);
    expect(video.play).not.toHaveBeenCalled();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true }));
    expect(video.currentTime).toBe(35);
    expect(video.paused).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }));
    expect(video.currentTime).toBe(25);
    expect(video.paused).toBe(true);
    vi.mocked(video.pause).mockClear();
    await vi.advanceTimersByTimeAsync(180);
    expect(video.pause).not.toHaveBeenCalled();
    pointer(track, 'pointermove', 40);
    expect(video.currentTime).toBe(25);
    pointer(track, 'pointerup', 40);
    expect(video.currentTime).toBe(25);
    expect(inputFor('B (seconds)').value).toBe('40.0');
  });
  it('creates a replacement when dragging a section body and seeks only on completion when outside it', () => {
    findButton('Enable loop').click();
    (document.querySelector('.mfs-loop-button') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',shiftKey:true,bubbles:true}));
    const track = document.querySelector('.mfs-loop-surface')!.shadowRoot!.querySelector('.timeline') as HTMLElement;
    track.getBoundingClientRect = video.getBoundingClientRect;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    video.currentTime = 27;
    const pointer = (target: Element, type: string, time: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: time * 6.4, button: 0 });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      target.dispatchEvent(event);
    };
    pointer(track.querySelector('.range')!, 'pointerdown', 27);
    pointer(track, 'pointermove', 28);
    expect(video.currentTime).toBe(27);
    pointer(track, 'pointermove', 42);
    expect(video.currentTime).toBe(27);
    pointer(track, 'pointermove', 12);
    expect(video.currentTime).toBe(27);
    pointer(track, 'pointerup', 12);
    expect(video.currentTime).toBeCloseTo(12);
    expect(inputFor('A (seconds)').valueAsNumber).toBe(12);
    expect(inputFor('B (seconds)').valueAsNumber).toBe(27);
    expect(video.paused).toBe(false);
  });
  it('ignores skip shortcuts while entering names', () => {
    document.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 100, clientY: 100 })
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
      })
    );
    expect(video.currentTime).toBe(15);
    inputFor('Name').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        composed: true,
      })
    );
    expect(video.currentTime).toBe(15);
  });
  it('stores named bookmarks and clears an active loop after a source change', async () => {
    inputFor('Name').value = 'Explanation';
    findButton('Bookmark this moment').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        command: expect.objectContaining({
          op: 'put',
          item: expect.objectContaining({ name: 'Explanation', start: 25 }),
        }),
      })
    );
    findButton('Enable loop').click();
    expect(root.textContent).toContain('Disable loop');
    video.dispatchEvent(new Event('emptied'));
    expect(root.textContent).toContain('Enable loop');
  });
  it('restores filters and removes owned DOM/listeners on cleanup', () => {
    const filtersRoot = document.querySelector('.mfs-youtube-filters-popup')?.shadowRoot;
    const brightness = filtersRoot?.querySelector<HTMLInputElement>('input[aria-label="Brightness"]');
    if (!brightness) throw new Error('Brightness control missing');
    brightness.value = '150';
    brightness.dispatchEvent(new Event('input'));
    expect(video.style.filter).toContain('brightness(150%)');
    tools?.cleanup();
    expect(video.style.filter).toBe('');
    expect(document.querySelector('.mfs-player-tools')).toBeNull();
    expect(changed.removeListener).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not enable persistent loop editing for a live stream', () => {
    Object.defineProperty(video, 'duration', { value: Infinity });
    video.dispatchEvent(new Event('durationchange'));
    expect(findButton('Edit loop').disabled).toBe(true);
    expect(findButton('Enable loop').disabled).toBe(true);
  });
});
