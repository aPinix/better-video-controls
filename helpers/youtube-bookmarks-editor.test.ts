// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SavedMoment } from './saved-media';
import { YouTubeBookmarksEditor } from './youtube-bookmarks-editor';

let editor: YouTubeBookmarksEditor;
let root: ShadowRoot;
let video: HTMLVideoElement;
let items: SavedMoment[];
const saved = vi.fn();
const deleted = vi.fn();
const restored = vi.fn();
const added = vi.fn();
const seek = vi.fn();
const changed = vi.fn();
const moment = (id: string, start: number): SavedMoment => ({
  id,
  start,
  name: `Moment ${id}`,
  mediaKey: 'youtube:test',
  url: 'https://www.youtube.com/watch?v=test',
  title: 'Test',
  createdAt: 1,
});
const point = () =>
  root.querySelector<HTMLButtonElement>('.point') as HTMLButtonElement;
const input = (name: string) =>
  root.querySelector<HTMLInputElement>(
    `input[aria-label="${name}"]`
  ) as HTMLInputElement;
const control = (text: string) => {
  const node = [...root.querySelectorAll('button')].find(
    (button) =>
      button.textContent === text || button.getAttribute('aria-label') === text
  );
  if (!node) throw new Error(`Missing control: ${text}`);
  return node;
};
const pointer = (
  target: EventTarget,
  type: string,
  x: number,
  altKey = false
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    button: 0,
    clientX: x,
    altKey,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  document.body.innerHTML =
    '<video></video><div id="timeline"></div><button id="anchor"></button>';
  video = document.querySelector('video') as HTMLVideoElement;
  Object.defineProperty(video, 'duration', { value: 100, configurable: true });
  Object.defineProperty(video, 'paused', { value: true, configurable: true });
  video.play = vi.fn(async () => {
    Object.defineProperty(video, 'paused', {
      value: false,
      configurable: true,
    });
  });
  video.pause = vi.fn(() => {
    Object.defineProperty(video, 'paused', { value: true, configurable: true });
  });
  video.currentTime = 40;
  const timeline = document.querySelector('#timeline') as HTMLElement;
  timeline.getBoundingClientRect = () => ({ width: 500, left: 0 }) as DOMRect;
  items = [moment('a', 25), moment('b', 75)];
  saved.mockImplementation(async (item) => {
    items = items.map((entry) => (entry.id === item.id ? item : entry));
    editor.update(items, true, true);
  });
  deleted.mockImplementation(async (id) => {
    items = items.filter((item) => item.id !== id);
    editor.update(items, true, true);
  });
  restored.mockImplementation(async (next) => {
    items = next.map((item: SavedMoment) => ({ ...item }));
    editor.update(items, true, true);
  });
  added.mockImplementation(async (time) => {
    items = [...items, moment('new', time)];
    editor.update(items, true, true);
  });
  editor = new YouTubeBookmarksEditor(video, timeline, {
    onSave: saved,
    onDelete: deleted,
    onAdd: added,
    onRestore: restored,
    onSeek: seek,
    onOpenChange: changed,
  });
  root = editor.host.shadowRoot as ShadowRoot;
  editor.update(items, true, true);
  editor.open(document.querySelector('#anchor') as HTMLButtonElement);
});
afterEach(() => {
  editor.cleanup();
  vi.useRealTimers();
  document.body.replaceChildren();
});

it.each([
  ['button', true],
  ['button', false],
  ['Alt', true],
  ['Alt', false],
] as const)(
  'previews bookmark dragging using %s and restores playback on close (playing: %s)',
  async (activation, playing) => {
    Object.defineProperty(video, 'paused', {
      value: !playing,
      configurable: true,
    });
    if (activation === 'button') control('Live tune').click();
    else
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Alt',
          altKey: true,
          bubbles: true,
        })
      );
    expect(control('Live tune').getAttribute('aria-pressed')).toBe('true');
    pointer(point(), 'pointerdown', 125, activation === 'Alt');
    expect(video.currentTime).toBe(25);
    expect(video.paused).toBe(false);
    pointer(document, 'pointermove', 225, activation === 'Alt');
    expect(video.currentTime).toBe(45);
    expect(saved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(180);
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(45);
    pointer(document, 'pointerup', 225, activation === 'Alt');
    await vi.advanceTimersByTimeAsync(0);
    expect(video.currentTime).toBe(40);
    expect(saved).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: 'a', start: 45 })
    );
    if (activation === 'Alt') {
      document.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Alt', bubbles: true })
      );
      expect(control('Live tune').getAttribute('aria-pressed')).toBe('false');
    }
    pointer(control('Done editing'), 'pointerdown', 0);
    control('Done editing').click();
    expect(editor.isOpen).toBe(false);
    expect(video.paused).toBe(!playing);
  }
);
it('opens a specific saved bookmark selected and ready to edit', () => {
  editor.close(false, false);
  editor.open(document.querySelector('#anchor') as HTMLButtonElement, 'b');
  expect(editor.isOpen).toBe(true);
  expect(input('Bookmark name').value).toBe('Moment b');
  expect(input('Bookmark time').value).toBe('00:01:15');
  expect(
    root.querySelector<HTMLButtonElement>('.point[aria-pressed="true"]')
      ?.dataset.bookmarkId
  ).toBe('b');
  expect(root.activeElement).toBe(input('Bookmark name'));
  expect(saved).not.toHaveBeenCalled();
});

it('can enter Live tune in the middle of a drag and leave on Alt release or focus loss', async () => {
  pointer(point(), 'pointerdown', 125);
  pointer(document, 'pointermove', 225);
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Alt', altKey: true, bubbles: true })
  );
  expect(video.currentTime).toBe(45);
  window.dispatchEvent(new Event('blur'));
  expect(video.currentTime).toBe(40);
  expect(video.paused).toBe(true);
  expect(control('Live tune').getAttribute('aria-pressed')).toBe('false');
  vi.mocked(video.pause).mockClear();
  await vi.advanceTimersByTimeAsync(180);
  expect(video.pause).not.toHaveBeenCalled();
  pointer(document, 'pointermove', 250);
  expect(video.currentTime).toBe(40);
  pointer(document, 'pointerup', 250);
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ start: 50 }));
});
it('previews new bookmarks without saving drafts until release', async () => {
  control('Live tune').click();
  const lane = root.querySelector('.lane') as HTMLElement;
  pointer(lane, 'pointerdown', 100);
  expect(video.currentTime).toBe(20);
  pointer(document, 'pointermove', 300);
  expect(video.currentTime).toBe(60);
  expect(added).not.toHaveBeenCalled();
  pointer(document, 'pointercancel', 300);
  expect(video.currentTime).toBe(40);
  expect(added).not.toHaveBeenCalled();
  expect(root.querySelectorAll('.point')).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(180);
  expect(video.currentTime).toBe(40);
});
it('does not seek or resume the previous video during navigation or ads', async () => {
  pointer(point(), 'pointerdown', 125, true);
  expect(video.currentTime).toBe(25);
  video.currentTime = 3;
  editor.update(items, true, false);
  expect(video.currentTime).toBe(3);
  editor.reset();
  await vi.advanceTimersByTimeAsync(180);
  expect(video.currentTime).toBe(3);
  expect(saved).not.toHaveBeenCalled();
  expect(control('Live tune').getAttribute('aria-pressed')).toBe('false');
});
it('reports failed preview playback while keeping editing usable', async () => {
  vi.mocked(video.play).mockRejectedValueOnce(
    new Error('Playback unavailable')
  );
  control('Live tune').click();
  pointer(point(), 'pointerdown', 125);
  await vi.advanceTimersByTimeAsync(0);
  expect(root.querySelector('[role=status]')?.textContent).toBe(
    'Preview could not start.'
  );
  pointer(document, 'pointermove', 225);
  pointer(document, 'pointerup', 225);
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledWith(expect.objectContaining({ start: 45 }));
});
it('navigates bookmarks in time order without changing or saving them', () => {
  items = [moment('b', 75), moment('a', 25), moment('c', 50)];
  editor.update(items, true, true);
  expect(input('Bookmark name').value).toBe('Moment a');
  expect(control('Previous bookmark').disabled).toBe(true);
  control('Next bookmark').click();
  expect(seek).toHaveBeenLastCalledWith(50);
  expect(input('Bookmark name').value).toBe('Moment c');
  expect(
    root.querySelector('[data-bookmark-id="c"]')?.getAttribute('aria-pressed')
  ).toBe('true');
  control('Next bookmark').click();
  expect(seek).toHaveBeenLastCalledWith(75);
  expect(control('Next bookmark').disabled).toBe(true);
  control('Previous bookmark').click();
  expect(seek).toHaveBeenLastCalledWith(50);
  expect(input('Bookmark time').value).toBe('00:00:50');
  expect(saved).not.toHaveBeenCalled();
  expect(restored).not.toHaveBeenCalled();
});
it('disables bookmark navigation for an empty list and while saving', async () => {
  saved.mockReturnValueOnce(new Promise(() => {}));
  input('Bookmark name').value = 'Saving';
  input('Bookmark name').dispatchEvent(new Event('change'));
  expect(control('Previous bookmark').disabled).toBe(true);
  expect(control('Next bookmark').disabled).toBe(true);
  expect(control('Live tune').disabled).toBe(true);
  editor.reset();
  editor.update([], true, true);
  editor.open(document.querySelector('#anchor') as HTMLButtonElement);
  expect(control('Previous bookmark').disabled).toBe(true);
  expect(control('Next bookmark').disabled).toBe(true);
  expect(seek).not.toHaveBeenCalled();
});

it('edits existing names and times without changing identity, creation date, or playback', async () => {
  const name = input('Bookmark name');
  name.value = 'Introduction';
  name.dispatchEvent(new Event('change'));
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'a',
      name: 'Introduction',
      start: 25,
      createdAt: 1,
    })
  );
  const time = input('Bookmark time');
  time.value = '00:00:35.125';
  time.dispatchEvent(new Event('change'));
  await vi.advanceTimersByTimeAsync(0);
  expect(items[0]).toMatchObject({
    id: 'a',
    name: 'Introduction',
    start: 35.125,
  });
  expect(video.currentTime).toBe(40);
  expect(seek).not.toHaveBeenCalled();
});
it('edits hour:minute:second timestamps with milliseconds and keeps the selected bookmark identifiable after reordering', async () => {
  Object.defineProperty(video, 'duration', { value: 7200 });
  const time = input('Bookmark time');
  expect(time.value).toBe('00:00:25');
  expect(root.querySelector('.selection-count')?.textContent).toBe('1 of 2');
  time.value = '01:02:03.125';
  time.dispatchEvent(new Event('change'));
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'a', start: 3723.125 })
  );
  expect(time.value).toBe('01:02:03.125');
  expect(root.querySelector('.selection-count')?.textContent).toBe('2 of 2');
  expect(
    root.querySelector('[data-bookmark-id="a"]')?.getAttribute('aria-pressed')
  ).toBe('true');
  expect(control('Next bookmark').disabled).toBe(true);
  expect(control('Previous bookmark').disabled).toBe(false);
  expect(video.currentTime).toBe(40);
});
it.each(['00:60:00', '00:00:60', '00:02:00', ''])(
  'shows recoverable timestamp feedback without saving invalid time (%s)',
  async (value) => {
    const time = input('Bookmark time');
    time.value = value;
    time.dispatchEvent(new Event('change'));
    expect(saved).not.toHaveBeenCalled();
    expect(time.getAttribute('aria-invalid')).toBe('true');
    expect(
      root.querySelector('[role=status]')?.getAttribute('data-error')
    ).toBe('true');
    editor.update(items, true, true);
    expect(time.value).toBe(value);
    time.value = '00:00:30.250';
    time.dispatchEvent(new Event('input'));
    time.dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(0);
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ start: 30.25 })
    );
    expect(time.getAttribute('aria-invalid')).toBeNull();
    expect(time.value).toBe('00:00:30.250');
  }
);
it('supports keyboard time stepping and clears an invalid draft when selecting another bookmark', async () => {
  const time = input('Bookmark time');
  time.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
  await vi.advanceTimersByTimeAsync(0);
  expect(time.value).toBe('00:00:26');
  time.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true })
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(time.value).toBe('00:00:25.900');
  time.value = 'invalid';
  time.dispatchEvent(new Event('change'));
  control('Next bookmark').click();
  expect(time.value).toBe('00:01:15');
  expect(time.getAttribute('aria-invalid')).toBeNull();
  expect(root.querySelector('.selection-count')?.textContent).toBe('2 of 2');
});
it('selects the next bookmark after deletion, retaining chronological Previous/Next navigation', async () => {
  items = [moment('a', 25), moment('b', 75), moment('c', 50)];
  editor.update(items, true, true);
  control('Next bookmark').click();
  expect(input('Bookmark name').value).toBe('Moment c');
  control('Delete').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(deleted).toHaveBeenCalledWith('c');
  expect(input('Bookmark name').value).toBe('Moment b');
  expect(root.querySelector('.selection-count')?.textContent).toBe('2 of 2');
  expect(control('Next bookmark').disabled).toBe(true);
  control('Previous bookmark').click();
  expect(input('Bookmark name').value).toBe('Moment a');
});
it('adds at the clicked timeline position and supports undo, redo, clear, and discard', async () => {
  const original = items.map((item) => ({ ...item }));
  root
    .querySelector('.lane')
    ?.dispatchEvent(new MouseEvent('click', { clientX: 300, bubbles: true }));
  await vi.advanceTimersByTimeAsync(0);
  expect(added).toHaveBeenCalledWith(60);
  expect(video.currentTime).toBe(40);
  expect(root.querySelector('.point svg')).toBeNull();
  control('Undo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual(original);
  control('Redo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toHaveLength(3);
  control('Clear').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual([]);
  control('Undo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toHaveLength(3);
  control('Discard changes').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual(original);
  expect(editor.isOpen).toBe(false);
});
it('creates a draft on press, keeps it through updates, and saves its dragged position on release', async () => {
  const lane = root.querySelector('.lane') as HTMLElement;
  pointer(lane, 'pointerdown', 100);
  expect(root.querySelectorAll('.point')).toHaveLength(3);
  expect(added).not.toHaveBeenCalled();
  pointer(document, 'pointermove', 300);
  editor.update(items, true, true);
  expect(root.querySelector('[data-draft-time="60"]')).not.toBeNull();
  input('Bookmark time').value = '';
  pointer(document, 'pointerup', 300);
  pointer(video, 'mouseup', 300);
  video.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(added).toHaveBeenCalledExactlyOnceWith(60);
  expect(editor.isOpen).toBe(true);
  expect(video.currentTime).toBe(40);
  control('Undo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items.map((item) => item.id)).toEqual(['a', 'b']);
});
it('adds once without movement and cancels an unfinished draft without saving', async () => {
  const lane = root.querySelector('.lane') as HTMLElement;
  pointer(lane, 'pointerdown', 100);
  pointer(document, 'pointerup', 100);
  lane.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(added).toHaveBeenCalledExactlyOnceWith(20);
  pointer(lane, 'pointerdown', 400);
  expect(root.querySelectorAll('.point')).toHaveLength(4);
  pointer(document, 'pointercancel', 400);
  expect(root.querySelectorAll('.point')).toHaveLength(3);
  expect(added).toHaveBeenCalledOnce();
});
it('creates and drags on the native YouTube seek bar without native seeking or dismissal', async () => {
  const player = document.createElement('div');
  player.id = 'movie_player';
  document.body.append(player);
  player.append(video);
  const bar = document.createElement('div');
  bar.className = 'ytp-progress-bar';
  bar.getBoundingClientRect = () => new DOMRect(50, 0, 400, 10);
  bar.innerHTML = '<div class="ytp-play-progress"></div>';
  player.append(bar);
  const nativeSeek = vi.fn();
  bar.addEventListener('pointerdown', nativeSeek);
  bar.addEventListener('click', nativeSeek);
  const child = bar.firstElementChild as HTMLElement;
  pointer(child, 'pointerdown', 150);
  expect(root.querySelectorAll('.point')).toHaveLength(3);
  pointer(document, 'pointermove', 350);
  pointer(child, 'pointerup', 350);
  child.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(added).toHaveBeenCalledExactlyOnceWith(75);
  expect(nativeSeek).not.toHaveBeenCalled();
  expect(editor.isOpen).toBe(true);
  expect(video.currentTime).toBe(40);
});
it('saves the drag position independently of the inspector input', async () => {
  pointer(point(), 'pointerdown', 125);
  pointer(document, 'pointermove', 225);
  input('Bookmark time').value = '';
  pointer(document, 'pointerup', 225);
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'a', start: 45 })
  );
});
it('keeps history and saved bookmarks intact when clear or undo fails', async () => {
  const original = items.map((item) => ({ ...item }));
  restored.mockRejectedValueOnce(new Error('Storage unavailable'));
  control('Clear').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual(original);
  expect(control('Undo').disabled).toBe(true);
  control('Clear').click();
  await vi.advanceTimersByTimeAsync(0);
  restored.mockRejectedValueOnce(new Error('Storage unavailable'));
  control('Undo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual([]);
  expect(control('Undo').disabled).toBe(false);
  control('Undo').click();
  await vi.advanceTimersByTimeAsync(0);
  expect(items).toEqual(original);
  control('Close').click();
  editor.open(document.querySelector('#anchor') as HTMLButtonElement);
  expect(control('Undo').disabled).toBe(true);
  expect(control('Discard changes').disabled).toBe(true);
});
it('keeps action pills anchored to the edit bar without adding stacked-toolbar clearance', () => {
  const player = document.createElement('div');
  player.className = 'html5-video-player';
  const toolbar = document.createElement('div');
  toolbar.className = 'mfs-youtube-controls';
  toolbar.dataset.stacked = 'true';
  document.body.append(player);
  player.append(video, toolbar);
  const timeline = document.querySelector('#timeline') as HTMLElement;
  Object.defineProperty(timeline, 'clientWidth', { value: 250 });
  timeline.getBoundingClientRect = () => ({ width: 500, top: 300 }) as DOMRect;
  toolbar.getBoundingClientRect = () => ({ top: 240 }) as DOMRect;
  editor.layout();
  const actions = root.querySelector('.actions') as HTMLElement;
  expect(actions.parentNode).toBe(root);
  expect(editor.host.style.getPropertyValue('--toolbar-clearance')).toBe('');
  expect((root.querySelector('.inspector') as HTMLElement).style.bottom).toBe(
    'calc(100% + 96px)'
  );
  expect(editor.host.style.getPropertyValue('--inspector-max-height')).toBe(
    '48px'
  );
  toolbar.dataset.stacked = 'false';
  editor.layout();
  expect(editor.host.style.getPropertyValue('--toolbar-clearance')).toBe('');
});
it('keeps a small-player workspace readable without reopening it on every layout and releases it on close', async () => {
  const player = document.createElement('div');
  player.className = 'html5-video-player';
  document.body.append(player);
  player.append(video);
  let width = 500;
  let height = 280;
  player.getBoundingClientRect = () => new DOMRect(24, 100, width, height);
  const timeline = document.querySelector('#timeline') as HTMLElement;
  Object.defineProperty(timeline, 'clientWidth', { get: () => width - 24 });
  timeline.getBoundingClientRect = () =>
    new DOMRect(36, 100 + height - 63, width - 24, 14);
  const workspace = root.querySelector('.workspace') as HTMLElement;
  workspace.showPopover = vi.fn();
  workspace.hidePopover = vi.fn();
  workspace.getBoundingClientRect = () => new DOMRect(532, 100, 484, 240);
  const inspector = root.querySelector('.inspector') as HTMLElement;
  Object.defineProperty(inspector, 'scrollHeight', { value: 132 });
  const actions = root.querySelector('.actions') as HTMLElement;
  actions.getBoundingClientRect = () =>
    new DOMRect(150, 100 + height - 110, 400, 44);
  editor.layout();
  expect(workspace.showPopover).toHaveBeenCalledOnce();
  expect(workspace.dataset.floating).toBe('true');
  expect(workspace.querySelector('.actions')).toBeNull();
  expect(actions.parentNode).toBe(root);
  expect(workspace.style.left).toBe('532px');
  editor.layout();
  expect(workspace.showPopover).toHaveBeenCalledOnce();
  width = 900;
  height = 500;
  editor.layout();
  expect(workspace.hidePopover).toHaveBeenCalledOnce();
  expect(workspace.hasAttribute('popover')).toBe(false);
  width = 500;
  height = 280;
  editor.layout();
  expect(workspace.showPopover).toHaveBeenCalledTimes(2);
  editor.close();
  expect(workspace.hidePopover).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(240);
  expect(workspace.hidePopover).toHaveBeenCalledTimes(2);
  expect(workspace.hasAttribute('popover')).toBe(false);
});
it('moves a marker during a drag and saves only when the adjustment finishes', async () => {
  pointer(point(), 'pointerdown', 125);
  pointer(document, 'pointermove', 225);
  expect(point().style.left).toBe('45%');
  expect(saved).not.toHaveBeenCalled();
  pointer(document, 'pointerup', 225);
  await vi.advanceTimersByTimeAsync(0);
  expect(saved).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ id: 'a', start: 45 })
  );
  expect(editor.isOpen).toBe(true);
  expect(video.currentTime).toBe(40);
});
it('supports arrow-key adjustments, clamps at the video limits, and preserves marker focus', async () => {
  point().focus();
  point().dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      composed: true,
    })
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(items[0]?.start).toBe(26);
  expect(root.activeElement).toBe(point());
  point().dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
      bubbles: true,
      composed: true,
    })
  );
  await vi.advanceTimersByTimeAsync(0);
  expect(items[0]?.start).toBe(25.9);
  pointer(point(), 'pointerdown', 125);
  pointer(document, 'pointermove', -1000);
  pointer(document, 'pointerup', -1000);
  await vi.advanceTimersByTimeAsync(0);
  expect(items[0]?.start).toBe(0);
});
it('does not commit cancelled drags or lose the last saved value on storage errors', async () => {
  pointer(point(), 'pointerdown', 125);
  pointer(document, 'pointermove', 225);
  pointer(document, 'pointercancel', 225);
  expect(saved).not.toHaveBeenCalled();
  expect(point().style.left).toBe('25%');
  saved.mockRejectedValueOnce(new Error('Could not save bookmark. Try again.'));
  input('Bookmark name').value = 'Failed edit';
  input('Bookmark name').dispatchEvent(new Event('change'));
  await vi.advanceTimersByTimeAsync(0);
  expect(input('Bookmark name').value).toBe('Moment a');
  expect(root.querySelector('[role=status]')?.textContent).toContain(
    'Could not save'
  );
});
it('closes smoothly on Escape and dismisses outside clicks without activating the video', async () => {
  const clicked = vi.fn();
  video.addEventListener('click', clicked);
  pointer(video, 'pointerdown', 0);
  video.click();
  expect(clicked).not.toHaveBeenCalled();
  expect(editor.isOpen).toBe(false);
  expect(editor.host.hidden).toBe(false);
  await vi.advanceTimersByTimeAsync(240);
  expect(editor.host.hidden).toBe(true);
  editor.open(document.querySelector('#anchor') as HTMLButtonElement);
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  expect(editor.isOpen).toBe(false);
  expect(editor.host.dataset.closing).toBe('true');
  await vi.advanceTimersByTimeAsync(240);
  expect(editor.host.hidden).toBe(true);
});
it('deletes the selected bookmark and closes immediately when disabled or reset', async () => {
  [...root.querySelectorAll('button')]
    .find((node) => node.textContent === 'Delete')
    ?.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(deleted).toHaveBeenCalledWith('a');
  expect(items).toHaveLength(1);
  editor.update(items, false, true);
  expect(editor.isOpen).toBe(false);
  expect(editor.host.hidden).toBe(true);
  editor.update(items, true, true);
  editor.open(document.querySelector('#anchor') as HTMLButtonElement);
  editor.reset();
  expect(editor.isOpen).toBe(false);
  expect(editor.host.hidden).toBe(true);
});
