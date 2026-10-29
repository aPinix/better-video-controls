import { formatBookmarkTime, parseBookmarkTime } from './bookmark-time';
import { formatTime, seekVideo } from './player-actions';
import { button, createHistoryIcon, element, field } from './player-tools-ui';
import { dismissPopoverOutside } from './popover-dismiss';
import type { SavedMoment } from './saved-media';

const styles = `
:host{font:13px/1.4 system-ui,sans-serif;color:#fff;color-scheme:dark;pointer-events:none;white-space:normal}
*{box-sizing:border-box}[hidden]{display:none!important}button,input{font:inherit;color:inherit}
button{cursor:pointer;border:1px solid #ffffff26;border-radius:999px;padding:6px 10px;background:#ffffff14;white-space:nowrap}button:hover{background:#ffffff28}button:disabled{opacity:.4;cursor:default}
button:focus-visible,input:focus-visible{outline:2px solid #a4c4ff;outline-offset:2px}
.workspace{display:contents}.workspace::backdrop{background:transparent;pointer-events:none}.workspace[data-floating=true]{display:flex;justify-content:center;color:#fff;color-scheme:dark;pointer-events:none}.workspace[data-floating=true] .inspector{position:relative;bottom:auto!important;right:auto;width:360px;max-width:100%;max-height:none}
.lane{position:absolute;inset:0;background:#172033cc;border:1px solid #a4c4ff;border-radius:5px;touch-action:none;pointer-events:auto;transition:opacity 200ms ease,transform 220ms ease}
.actions{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100% - 16px);pointer-events:auto;transition:opacity 200ms ease}
.actions-pill{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:6px;padding:5px;max-width:100%;border:1px solid #ffffff35;border-radius:999px;background:#202020f2;box-shadow:0 3px 12px #0006}
.actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 12px;font-size:12px;line-height:18px;font-weight:600}
.done{background:#fff;color:#202020;border-color:transparent}.done:not(:disabled):hover{background:#e4e4e4}
.done[data-changed=true]{background:#22c55e;color:#052e16}.done[data-changed=true]:not(:disabled):hover{background:#4ade80}
.clear{background:transparent;color:#eee;border-color:transparent;transition:color 160ms ease,background-color 160ms ease}.clear:not(:disabled):hover{color:#f87171;background:#ef444420}
.discard{color:#fca5a5;border-color:#f8717140;background:#ef444414}.discard:not(:disabled):hover{color:#fecaca;background:#ef444430;border-color:#f8717180}
.live-tune-control{position:relative;display:inline-flex}.live-tune[aria-pressed=true]{background:#f59e0b;color:#291500;border-color:#f59e0b}.live-tune[aria-pressed=true]:hover{background:#fbbf24}
.live-tune-help{position:absolute;bottom:calc(100% + 12px);right:0;display:flex;align-items:center;gap:4px;width:max-content;padding:6px 9px;border:1px solid #ffffff30;border-radius:999px;background:#202020f5;color:#ccc;font-size:11px;line-height:16px;white-space:nowrap;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 120ms ease}.live-tune-control:hover .live-tune-help,.live-tune-control:focus-within .live-tune-help{opacity:1;visibility:visible}.live-tune-help kbd{padding:0 4px;border:1px solid #ffffff40;border-radius:4px;background:#ffffff12;font:inherit;font-weight:600}
.inspector{position:absolute;bottom:calc(100% + 96px);right:0;width:360px;max-width:calc(100% - 8px);max-height:var(--inspector-max-height,none);overflow:auto;padding:10px 12px;background:#202020f2;border:1px solid #ffffff30;border-radius:14px;box-shadow:0 4px 16px #0006;pointer-events:auto;transition:opacity 200ms ease,transform 220ms ease}
header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}h2{font-size:13px;margin:0}.status{font-size:10px;color:#aaa;text-align:right}.status[data-error=true]{color:#fca5a5}
.inspector-title,.bookmark-navigation{display:flex;align-items:center;gap:4px}.inspector-title{gap:8px;min-width:0}.selection-count{padding:2px 6px;border:1px solid #38d9ff44;border-radius:999px;background:#38d9ff18;color:#a4efff;font-size:10px;font-weight:600;white-space:nowrap}.bookmark-navigation button{display:flex;align-items:center;justify-content:center;gap:3px;min-height:28px;padding:4px 6px;background:transparent;border-color:transparent;font-size:11px}.bookmark-navigation button:not(:disabled):hover{background:#ffffff20}.bookmark-navigation svg{width:14px;height:14px;pointer-events:none}
.fields-grid{display:grid;grid-template-columns:minmax(0,1fr) 130px;gap:10px}.field{display:flex;flex-direction:column;align-items:stretch;gap:4px;margin:0;min-width:0}.field>span{color:#bbb;font-size:11px}.field input{width:100%;min-width:0;border:1px solid #ffffff30;border-radius:6px;background:#121212;padding:6px 7px;font-size:12px}.bookmark-time{font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace}.bookmark-time[aria-invalid=true]{border-color:#f87171}
.inspector-footer,.inspector-actions{display:flex;align-items:center;gap:6px}.inspector-footer{justify-content:space-between;flex-wrap:wrap;margin-top:8px}.inspector-actions button{padding:5px 8px;font-size:11px}.delete-bookmark{color:#fca5a5;border-color:#f8717140;background:#ef444414}.delete-bookmark:not(:disabled):hover{color:#fecaca;background:#ef444430;border-color:#f8717180}
.editor-hint{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 10px;width:max-content;max-width:100%;padding:5px 9px;border:1px solid #ffffff26;border-radius:14px;background:#202020ee;color:#ccc;font-size:11px;line-height:16px;text-align:center;pointer-events:none;transition:opacity 120ms ease}.editor-hint>span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.editor-hint kbd{padding:0 4px;border:1px solid #ffffff40;border-radius:4px;background:#ffffff12;font:inherit;font-weight:600}.actions:has(.live-tune-control:hover) .editor-hint,.actions:has(.live-tune-control:focus-within) .editor-hint{opacity:0}.empty{font-size:12px;color:#ccc;margin:0}
.point{position:absolute;top:0;bottom:0;width:16px;padding:0;border:0;border-radius:4px;background:transparent;transform:translateX(-50%);cursor:ew-resize;touch-action:none}.point::before{content:'';position:absolute;top:0;bottom:0;left:6px;width:4px;border-radius:2px;background:#38d9ff}.point[aria-pressed=true],.point:hover{background:#38d9ff22}.point:hover::before,.point[aria-pressed=true]::before{background:#8beaff}
.point-label{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);max-width:180px;overflow:hidden;text-overflow:ellipsis;background:#202020f2;border-radius:7px;padding:4px 7px;font-size:11px;white-space:nowrap;pointer-events:none;opacity:0}.point:hover .point-label,.point:focus-visible .point-label,.lane[data-dragging=true] .point[aria-pressed=true] .point-label{opacity:1}
.point[aria-pressed=true]{z-index:3;background:#38d9ff33}.point[aria-pressed=true]::before{top:-2px;bottom:-2px;left:5px;width:6px;background:#8beaff;box-shadow:0 0 0 1px #fff,0 0 10px #38d9ff80}.point[aria-pressed=true]::after{content:'';position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:8px;height:8px;border:1px solid #fff;border-radius:50%;background:#8beaff}
:host([data-closing=true]) .lane{opacity:0;transform:scaleY(.2)}:host([data-closing=true]) .actions,:host([data-closing=true]) .inspector{opacity:0;transform:translateY(12px);pointer-events:none}:host([data-closing=true]) .actions{transform:translate(-50%,12px)}
:host([data-closing=true]) .actions{transition:opacity 200ms ease,transform 220ms ease}
@media(prefers-reduced-motion:reduce){.lane,.actions,.inspector,.clear,.live-tune-help,.editor-hint{transition:none}}
`;

/** Edits the existing point bookmarks without creating a separate library. */
export class YouTubeBookmarksEditor {
  readonly host: HTMLDivElement;
  private root: ShadowRoot;
  private workspace: HTMLDivElement;
  private lane: HTMLDivElement;
  private name: HTMLInputElement;
  private time: HTMLInputElement;
  private inspector: HTMLDivElement;
  private status: HTMLSpanElement;
  private empty: HTMLParagraphElement;
  private fields: HTMLDivElement;
  private controls: HTMLDivElement;
  private hint: HTMLDivElement;
  private selectionCount: HTMLSpanElement;
  private displayedId: string | null = null;
  private timeError = false;
  private discard: HTMLButtonElement;
  private done: HTMLButtonElement;
  private clear: HTMLButtonElement;
  private undo: HTMLButtonElement;
  private redo: HTMLButtonElement;
  private liveTune: HTMLButtonElement;
  private previous: HTMLButtonElement;
  private next: HTMLButtonElement;
  private liveTuneEnabled = false;
  private altLiveTune = false;
  private liveTuneWasPlaying: boolean | null = null;
  private liveTuneTimer: ReturnType<typeof setTimeout> | undefined;
  private baseline: SavedMoment[] = [];
  private undoStack: SavedMoment[][] = [];
  private redoStack: SavedMoment[][] = [];
  private items: SavedMoment[] = [];
  private selected: string | null = null;
  private opened = false;
  private closing = false;
  private enabled = false;
  private available = false;
  private busy = false;
  private disposed = false;
  private dragClick = false;
  private generation = 0;
  private anchor: HTMLButtonElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private cleanups: Array<() => void> = [];
  private drag: {
    item: SavedMoment;
    x: number;
    pointer: number;
    width: number;
    moved: boolean;
    created: boolean;
    start: number;
    originalPlaybackTime: number;
    liveTuned: boolean;
  } | null = null;

  constructor(
    private video: HTMLVideoElement,
    private timeline: HTMLElement,
    private actions: {
      onSave: (item: SavedMoment) => Promise<void>;
      onDelete: (id: string) => Promise<void>;
      onAdd: (time: number) => Promise<void>;
      onRestore: (items: SavedMoment[]) => Promise<void>;
      onSeek: (time: number) => void;
      onOpenChange: () => void;
    }
  ) {
    const doc = video.ownerDocument;
    this.host = element(doc, 'div', 'mfs-youtube-bookmarks-editor');
    this.host.style.cssText =
      'position:absolute;inset:0;z-index:12;pointer-events:none;overflow:visible';
    this.host.hidden = true;
    this.root = this.host.attachShadow({ mode: 'open' });
    const style = element(doc, 'style');
    style.textContent = styles;
    this.lane = element(doc, 'div', 'lane');
    this.controls = element(doc, 'div', 'actions');
    const controls = this.controls;
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Bookmark editing');
    this.hint = element(doc, 'div', 'editor-hint');
    this.hint.append(
      element(doc, 'span', '', 'Click timeline to add · Drag to move')
    );
    const keys = element(doc, 'span');
    keys.append(
      element(doc, 'kbd', '', '←'),
      element(doc, 'kbd', '', '→'),
      doc.createTextNode(' 1s · '),
      element(doc, 'kbd', '', 'Shift'),
      doc.createTextNode(' 0.1s')
    );
    this.hint.append(keys);
    controls.append(this.hint);
    const toolsPill = element(doc, 'div', 'actions-pill bookmark-tools-pill');
    toolsPill.setAttribute('role', 'group');
    toolsPill.setAttribute('aria-label', 'Bookmark tools');
    const finishPill = element(doc, 'div', 'actions-pill bookmark-finish-pill');
    finishPill.setAttribute('role', 'group');
    finishPill.setAttribute('aria-label', 'Finish bookmark editing');
    controls.append(toolsPill, finishPill);
    this.discard = button(
      doc,
      'Discard changes',
      () => {
        void this.mutate(
          () => actions.onRestore(this.snapshot(this.baseline)),
          false
        ).then((saved) => {
          if (saved) this.close(true);
        });
      },
      finishPill
    );
    this.discard.className = 'discard';
    this.done = button(doc, 'Close', () => this.close(true), finishPill);
    this.done.className = 'done';
    this.clear = button(
      doc,
      'Clear',
      () => {
        void this.mutate(() => actions.onRestore([]));
      },
      toolsPill
    );
    this.clear.className = 'clear';
    this.undo = button(
      doc,
      'Undo',
      () => void this.restoreHistory(false),
      toolsPill
    );
    this.redo = button(
      doc,
      'Redo',
      () => void this.restoreHistory(true),
      toolsPill
    );
    this.undo.prepend(createHistoryIcon(doc));
    this.redo.prepend(createHistoryIcon(doc, true));
    const tuneControl = element(doc, 'span', 'live-tune-control');
    this.liveTune = button(
      doc,
      'Live tune',
      () => {
        this.liveTuneEnabled = !this.liveTuneEnabled;
        this.syncLiveTune();
      },
      tuneControl
    );
    this.liveTune.className = 'live-tune';
    this.liveTune.setAttribute('aria-pressed', 'false');
    const tuneHelp = element(doc, 'span', 'live-tune-help');
    tuneHelp.id = 'bookmark-live-tune-help';
    tuneHelp.setAttribute('role', 'tooltip');
    tuneHelp.append(
      element(doc, 'kbd', '', 'Alt'),
      doc.createTextNode(' + drag to preview')
    );
    tuneControl.append(tuneHelp);
    this.liveTune.setAttribute('aria-describedby', tuneHelp.id);
    toolsPill.append(this.undo, this.redo, tuneControl, this.clear);
    for (const control of controls.querySelectorAll('button')) {
      const label = control.textContent ?? '';
      control.setAttribute('aria-label', label);
      control.title = label;
    }
    this.lane.setAttribute(
      'aria-label',
      'Click the timeline to add a bookmark'
    );
    this.lane.addEventListener('pointerdown', (event) => {
      if (event.target === this.lane)
        this.createDrag(event, this.timeline.getBoundingClientRect());
    });
    this.lane.addEventListener('click', (event) => {
      if (event.target !== this.lane || !this.opened || this.busy) return;
      const rect = this.timeline.getBoundingClientRect();
      if (!rect.width) return;
      const time = this.clamp(
        ((event.clientX - rect.left) / rect.width) * video.duration
      );
      const existingIds = new Set(this.items.map((item) => item.id));
      void this.mutate(async () => {
        await actions.onAdd(time);
        this.selected =
          this.items.find((item) => !existingIds.has(item.id))?.id ??
          this.selected;
      });
    });
    this.inspector = element(doc, 'div', 'inspector');
    this.inspector.setAttribute('role', 'dialog');
    this.inspector.setAttribute('aria-label', 'Edit bookmarks');
    const header = element(doc, 'header');
    const title = element(doc, 'div', 'inspector-title');
    const navigation = element(doc, 'div', 'bookmark-navigation');
    navigation.setAttribute('role', 'group');
    navigation.setAttribute('aria-label', 'Navigate bookmarks');
    this.previous = button(
      doc,
      'Previous',
      () => this.navigate(-1),
      navigation
    );
    this.next = button(doc, 'Next', () => this.navigate(1), navigation);
    for (const [control, label, path] of [
      [this.previous, 'Previous bookmark', 'M15 18l-6-6 6-6'],
      [this.next, 'Next bookmark', 'M9 18l6-6-6-6'],
    ] as const) {
      control.setAttribute('aria-label', label);
      control.title = label;
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      const shape = doc.createElementNS(svg.namespaceURI, 'path');
      shape.setAttribute('d', path);
      svg.append(shape);
      if (control === this.previous) control.prepend(svg);
      else control.append(svg);
    }
    this.selectionCount = element(doc, 'span', 'selection-count');
    title.append(element(doc, 'h2', '', 'Edit bookmark'), this.selectionCount);
    header.append(title);
    this.status = element(doc, 'span', 'status');
    this.status.setAttribute('role', 'status');
    header.append(this.status);
    this.fields = element(doc, 'div');
    const inputs = element(doc, 'div', 'fields-grid');
    this.fields.append(inputs);
    this.name = element(doc, 'input');
    this.name.maxLength = 160;
    this.name.setAttribute('aria-label', 'Bookmark name');
    this.name.addEventListener('change', () => this.rename());
    this.name.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.rename();
      }
    });
    field(doc, 'Name', this.name, inputs);
    this.time = element(doc, 'input', 'bookmark-time');
    this.time.type = 'text';
    this.time.placeholder = '00:00:00';
    this.time.maxLength = 20;
    this.time.spellcheck = false;
    this.time.setAttribute('aria-label', 'Bookmark time');
    this.time.setAttribute(
      'aria-description',
      'Hours:minutes:seconds. Milliseconds optional.'
    );
    this.time.title = 'Hours:minutes:seconds, for example 00:01:25.500';
    this.time.addEventListener('input', () => this.clearTimeError());
    this.time.addEventListener('change', () => this.commitTime());
    this.time.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.commitTime();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const time =
          parseBookmarkTime(this.time.value) ?? this.current()?.start;
        if (time === undefined || time === null) return;
        this.time.value = formatBookmarkTime(
          this.clamp(
            time +
              (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 0.1 : 1)
          )
        );
        this.commitTime();
      }
    });
    field(doc, 'Time (h:m:s)', this.time, inputs);
    const footer = element(doc, 'div', 'inspector-footer');
    const row = element(doc, 'div', 'inspector-actions');
    const jump = button(
      doc,
      'Jump',
      () => {
        const item = this.current();
        if (item) actions.onSeek(item.start);
      },
      row
    );
    jump.setAttribute('aria-label', 'Go to moment');
    jump.title = 'Go to selected bookmark';
    const remove = button(
      doc,
      'Delete',
      () => {
        const item = this.current();
        if (!item) return;
        const ordered = this.orderedBookmarks();
        const index = ordered.findIndex((bookmark) => bookmark.id === item.id);
        const next = ordered[index + 1] ?? ordered[index - 1];
        void this.mutate(async () => {
          await actions.onDelete(item.id);
          this.selected = next?.id ?? null;
        });
      },
      row
    );
    remove.className = 'delete-bookmark';
    remove.title = 'Delete selected bookmark';
    footer.append(navigation, row);
    this.fields.append(footer);
    this.empty = element(
      doc,
      'p',
      'empty',
      'Click the timeline to add a bookmark.'
    );
    this.inspector.append(header, this.fields, this.empty);
    this.workspace = element(doc, 'div', 'workspace');
    this.workspace.append(this.inspector);
    this.root.append(style, this.lane, this.workspace, controls);
    timeline.append(this.host);
    const listen = (
      target: EventTarget,
      type: string,
      handler: EventListener,
      capture = false
    ) => {
      target.addEventListener(type, handler, capture);
      this.cleanups.push(() =>
        target.removeEventListener(type, handler, capture)
      );
    };
    for (const type of [
      'pointerdown',
      'mousedown',
      'click',
      'dblclick',
      'wheel',
      'keydown',
    ])
      listen(this.root, type, (event) => event.stopPropagation());
    listen(
      doc,
      'pointermove',
      (event) => this.move(event as PointerEvent),
      true
    );
    listen(
      doc,
      'pointerup',
      (event) => this.finish(event as PointerEvent),
      true
    );
    listen(doc, 'pointercancel', () => this.cancelDrag(), true);
    listen(
      doc,
      'pointerdown',
      () => {
        this.dragClick = false;
      },
      true
    );
    for (const type of ['mouseup', 'click'])
      listen(
        doc,
        type,
        (event) => {
          if (!this.dragClick) return;
          if (type === 'click') this.dragClick = false;
          event.preventDefault();
          event.stopImmediatePropagation();
        },
        true
      );
    const seekbarEvent = (event: Event) => {
      if (
        !this.opened ||
        event.composedPath().includes(this.host) ||
        !this.isSeekbarPath(event.composedPath())
      )
        return;
      const mouse = event as PointerEvent;
      if (mouse.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'pointerdown') {
        const native = this.video
          .closest('#movie_player,.html5-video-player')
          ?.querySelector('.ytp-progress-bar');
        this.createDrag(
          mouse,
          native?.getBoundingClientRect() ??
            this.timeline.getBoundingClientRect()
        );
      }
    };
    for (const type of [
      'pointerdown',
      'mousedown',
      'pointerup',
      'mouseup',
      'click',
    ])
      listen(doc, type, seekbarEvent, true);
    listen(
      doc,
      'keydown',
      (event) => {
        const key = event as KeyboardEvent;
        if (
          this.opened &&
          !key.isComposing &&
          (key.key === 'Alt' || key.altKey)
        )
          this.setAltLiveTune(true);
        if (
          (this.opened || this.closing) &&
          (event as KeyboardEvent).key === 'Escape'
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.close(true);
        }
      },
      true
    );
    listen(
      doc,
      'keyup',
      (event) => {
        if (!(event as KeyboardEvent).altKey) this.setAltLiveTune(false);
      },
      true
    );
    const win = doc.defaultView;
    if (win) listen(win, 'blur', () => this.setAltLiveTune(false));
    listen(doc, 'visibilitychange', () => {
      if (doc.hidden) this.setAltLiveTune(false);
    });
    this.cleanups.push(
      dismissPopoverOutside(
        doc,
        () => this.opened,
        (path) =>
          path.includes(this.host) ||
          path.includes(this.anchor as EventTarget) ||
          this.isSeekbarPath(path),
        () => this.close()
      )
    );
  }

  get isOpen() {
    return this.opened;
  }
  get isVisible() {
    return this.opened || this.closing;
  }

  update(items: SavedMoment[], enabled: boolean, available: boolean) {
    if (this.disposed) return;
    this.enabled = enabled;
    this.available = available;
    this.items = items
      .filter((item) => item.end === undefined)
      .map((item) => ({ ...item }));
    if (this.drag?.created)
      this.items.push({ ...this.drag.item, start: this.drag.start });
    if (!enabled || !available) this.close(false, false);
    if (!this.drag) this.render();
  }

  layout() {
    if (!this.isVisible) return;
    if (this.closing) return;
    const player = this.video.closest('.html5-video-player');
    const rect = this.timeline.getBoundingClientRect();
    const scale = this.timeline.clientWidth
      ? rect.width / this.timeline.clientWidth
      : 1;
    const playerRect = player?.getBoundingClientRect();
    if (
      this.workspace.dataset.floating === 'true' &&
      playerRect &&
      playerRect.width / scale >= 720 &&
      playerRect.height / scale >= 400
    )
      this.hideFloatingWorkspace();
    const inspectorGap = Math.max(
      96,
      (this.controls.getBoundingClientRect().height +
        this.hint.getBoundingClientRect().height) /
        scale +
        28
    );
    this.inspector.style.bottom = `calc(100% + ${inspectorGap}px)`;
    if (player && scale > 0) {
      const height =
        (rect.top - player.getBoundingClientRect().top) / scale -
        inspectorGap -
        8;
      this.host.style.setProperty(
        '--inspector-max-height',
        `${Math.max(48, height)}px`
      );
      if (
        playerRect &&
        (this.workspace.dataset.floating === 'true' ||
          height < this.inspector.scrollHeight ||
          this.controls.getBoundingClientRect().top < playerRect.top + 8)
      )
        this.positionFloatingWorkspace(playerRect);
    }
  }
  private hideFloatingWorkspace() {
    if (this.workspace.dataset.floating !== 'true') return;
    try {
      this.workspace.hidePopover();
    } catch {
      /* The page may already be closing. */
    }
    this.workspace.removeAttribute('popover');
    delete this.workspace.dataset.floating;
    this.workspace.style.cssText = '';
  }
  private positionFloatingWorkspace(player: DOMRect) {
    const win = this.video.ownerDocument.defaultView;
    if (!win || typeof this.workspace.showPopover !== 'function') return;
    const rightSpace = win.innerWidth - player.right - 16;
    const leftSpace = player.left - 16;
    const beside = Math.max(rightSpace, leftSpace) >= 320;
    const onRight = rightSpace >= leftSpace;
    const width = Math.max(
      1,
      Math.min(
        560,
        win.innerWidth - 16,
        beside ? Math.max(rightSpace, leftSpace) : Infinity
      )
    );
    const x = beside
      ? onRight
        ? player.right + 8
        : player.left - width - 8
      : Math.max(
          8,
          Math.min(
            win.innerWidth - width - 8,
            player.left + (player.width - width) / 2
          )
        );
    this.workspace.style.cssText = `position:fixed;inset:auto;left:${x}px;top:8px;width:${width}px;height:auto;max-width:none;max-height:${Math.max(48, win.innerHeight - 16)}px;overflow:auto;margin:0;border:0;padding:0;background:transparent;box-shadow:none`;
    if (this.workspace.dataset.floating !== 'true') {
      this.workspace.dataset.floating = 'true';
      this.workspace.setAttribute('popover', 'manual');
      try {
        this.workspace.showPopover();
      } catch {
        this.hideFloatingWorkspace();
        return;
      }
    }
    const height = this.workspace.getBoundingClientRect().height;
    const below = player.bottom + 8;
    const preferred = beside
      ? player.top
      : below + height <= win.innerHeight - 8
        ? below
        : player.top - height - 8;
    this.workspace.style.top = `${Math.max(8, Math.min(win.innerHeight - height - 8, preferred))}px`;
  }

  open(anchor: HTMLButtonElement, selectedId?: string) {
    if (this.disposed || !this.enabled || !this.available) return;
    if (!this.opened) {
      this.baseline = this.snapshot();
      this.undoStack = [];
      this.redoStack = [];
      this.liveTuneWasPlaying = null;
    }
    clearTimeout(this.closeTimer);
    this.closing = false;
    this.anchor = anchor;
    this.opened = true;
    this.syncLiveTune();
    this.host.hidden = false;
    this.host.dataset.closing = 'false';
    this.host.inert = false;
    if (selectedId && this.items.some((item) => item.id === selectedId))
      this.selected = selectedId;
    else this.selected ??= this.items[0]?.id ?? null;
    this.status.textContent = '';
    this.render();
    this.layout();
    this.actions.onOpenChange();
    if (selectedId && this.selected === selectedId) {
      this.name.focus({ preventScroll: true });
      this.name.select();
    }
  }

  close(focus = false, animate = true) {
    if (!this.opened && !this.closing) return;
    this.cancelDrag(this.available);
    this.opened = false;
    this.altLiveTune = false;
    this.syncLiveTune();
    const resume = this.liveTuneWasPlaying;
    this.liveTuneWasPlaying = null;
    if (resume !== null && !this.disposed && this.available) {
      if (resume && this.video.paused) void this.video.play().catch(() => {});
      else if (!resume && !this.video.paused) this.video.pause();
    }
    clearTimeout(this.closeTimer);
    this.closing =
      animate &&
      !this.video.ownerDocument.defaultView?.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    this.host.dataset.closing = String(this.closing);
    this.host.inert = true;
    if (this.closing)
      this.closeTimer = setTimeout(() => {
        this.closing = false;
        this.hideFloatingWorkspace();
        this.host.hidden = true;
        this.actions.onOpenChange();
      }, 240);
    else {
      this.hideFloatingWorkspace();
      this.host.hidden = true;
    }
    if (focus && this.anchor?.isConnected) this.anchor.focus();
    this.actions.onOpenChange();
  }

  reset() {
    this.generation++;
    // Navigation and shutdown must not resume the previous video's playback.
    this.liveTuneWasPlaying = null;
    this.cancelDrag(false);
    this.close(false, false);
    this.items = [];
    this.selected = null;
    this.busy = false;
    this.baseline = [];
    this.undoStack = [];
    this.redoStack = [];
    this.render();
  }
  private current() {
    return this.items.find((item) => item.id === this.selected);
  }
  private orderedBookmarks() {
    return this.items
      .filter((item) => item.start < this.video.duration)
      .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  }
  private navigate(direction: -1 | 1) {
    if (!this.opened || this.busy) return;
    const items = this.orderedBookmarks();
    const index = items.findIndex((item) => item.id === this.selected);
    const next = items[index + direction];
    if (index < 0 || !next) return;
    this.cancelDrag();
    this.selected = next.id;
    this.actions.onSeek(next.start);
    this.render();
  }
  private get liveTuneActive() {
    return this.opened && (this.liveTuneEnabled || this.altLiveTune);
  }
  private setAltLiveTune(held: boolean) {
    const next = held && this.opened;
    if (next === this.altLiveTune) return;
    this.altLiveTune = next;
    this.syncLiveTune();
  }
  private syncLiveTune() {
    const active = this.liveTuneActive;
    const changed =
      this.liveTune.getAttribute('aria-pressed') !== String(active);
    this.liveTune.setAttribute('aria-pressed', String(active));
    if (!changed || !this.drag) return;
    if (active) this.previewLiveTune();
    else this.stopLiveTuneDrag(this.drag);
  }
  private previewLiveTune() {
    const drag = this.drag;
    if (!drag || !this.liveTuneActive) return;
    this.liveTuneWasPlaying ??= !this.video.paused;
    drag.liveTuned = true;
    clearTimeout(this.liveTuneTimer);
    seekVideo(this.video, drag.start);
    if (this.video.paused)
      void this.video.play().catch(() => {
        if (this.disposed || this.drag !== drag || !this.liveTuneActive) return;
        this.status.textContent = 'Preview could not start.';
        this.status.dataset.error = 'true';
      });
    this.liveTuneTimer = setTimeout(() => {
      if (this.disposed || this.drag !== drag || !this.liveTuneActive) return;
      this.video.pause();
      seekVideo(this.video, drag.start);
    }, 180);
  }
  private stopLiveTuneDrag(drag: NonNullable<YouTubeBookmarksEditor['drag']>) {
    clearTimeout(this.liveTuneTimer);
    if (!drag.liveTuned) return;
    this.video.pause();
    seekVideo(this.video, drag.originalPlaybackTime);
  }
  private isSeekbarPath(path: EventTarget[]) {
    const player = this.video.closest('#movie_player,.html5-video-player');
    return (
      path.includes(this.timeline) ||
      path.some(
        (target) =>
          target instanceof HTMLElement &&
          player?.contains(target) &&
          target.matches(
            '.ytp-progress-bar,.ytp-progress-bar-container,.ytp-progress-list'
          )
      )
    );
  }
  private createDrag(event: PointerEvent, rect: DOMRect) {
    if (
      event.button !== 0 ||
      !this.opened ||
      this.busy ||
      this.drag ||
      !rect.width
    )
      return;
    event.preventDefault();
    const start = this.clamp(
      ((event.clientX - rect.left) / rect.width) * this.video.duration
    );
    if (!Number.isFinite(start)) return;
    const item: SavedMoment = {
      id: crypto.randomUUID(),
      start,
      name: `Moment ${formatTime(start)}`,
      mediaKey: 'draft',
      url: this.video.ownerDocument.location.href,
      title: this.video.ownerDocument.title,
      createdAt: Date.now(),
    };
    this.items.push(item);
    this.selected = item.id;
    this.render();
    this.drag = {
      item,
      x: event.clientX,
      pointer: event.pointerId,
      width: rect.width,
      moved: false,
      created: true,
      start,
      originalPlaybackTime: this.video.currentTime,
      liveTuned: false,
    };
    this.setAltLiveTune(event.altKey);
    this.previewLiveTune();
    this.lane.dataset.dragging = 'true';
  }
  private clamp(time: number) {
    return (
      Math.round(
        Math.max(0, Math.min(this.video.duration - 0.001, time)) * 1000
      ) / 1000
    );
  }
  private rename() {
    const item = this.current();
    if (!item || this.busy) return;
    const name = this.name.value.trim();
    if (!name) {
      this.status.textContent = 'Choose a name.';
      this.status.dataset.error = 'true';
      return;
    }
    if (name !== item.name) this.save({ ...item, name });
  }
  private clearTimeError() {
    this.time.setCustomValidity('');
    this.time.removeAttribute('aria-invalid');
    if (this.timeError) {
      this.status.textContent = '';
      this.status.dataset.error = 'false';
    }
    this.timeError = false;
  }
  private commitTime() {
    const item = this.current();
    if (!item || this.busy) return;
    const time = parseBookmarkTime(this.time.value);
    if (time === null || time >= this.video.duration) {
      const message =
        time === null
          ? 'Use hours:minutes:seconds, e.g. 00:01:25.'
          : `Choose a time before ${formatBookmarkTime(this.video.duration)}.`;
      this.timeError = true;
      this.time.setCustomValidity(message);
      this.time.setAttribute('aria-invalid', 'true');
      this.status.textContent = message;
      this.status.dataset.error = 'true';
      return;
    }
    this.clearTimeError();
    this.time.value = formatBookmarkTime(time);
    if (time !== item.start) this.save({ ...item, start: time });
  }
  private save(item: SavedMoment) {
    if (!Number.isFinite(item.start) || this.busy || !this.opened) return;
    void this.mutate(() => this.actions.onSave(item));
  }
  private snapshot(items = this.items) {
    return items.map((item) => ({ ...item }));
  }
  private signature(items: SavedMoment[]) {
    return JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)));
  }
  private async restoreHistory(redo: boolean) {
    const from = redo ? this.redoStack : this.undoStack;
    const to = redo ? this.undoStack : this.redoStack;
    const next = from.at(-1);
    if (!next || this.busy) return;
    const previous = this.snapshot();
    const saved = await this.mutate(
      () => this.actions.onRestore(this.snapshot(next)),
      false
    );
    if (saved) {
      from.pop();
      to.push(previous);
      this.render();
    }
  }
  private async mutate(
    action: () => Promise<void>,
    record = true
  ): Promise<boolean> {
    if (this.busy || !this.opened || !this.available) return false;
    const generation = this.generation;
    const previous = this.snapshot();
    this.busy = true;
    this.status.textContent = 'Saving…';
    this.status.dataset.error = 'false';
    this.renderInspector();
    try {
      await action();
      if (generation === this.generation && !this.disposed) {
        if (record && this.signature(previous) !== this.signature(this.items)) {
          this.undoStack.push(previous);
          if (this.undoStack.length > 100) this.undoStack.shift();
          this.redoStack = [];
        }
        this.status.textContent = 'Saved';
        return true;
      }
    } catch (error) {
      if (generation === this.generation && !this.disposed) {
        this.status.textContent =
          error instanceof Error ? error.message : 'Could not save bookmark.';
        this.status.dataset.error = 'true';
      }
    } finally {
      if (generation === this.generation && !this.disposed) {
        this.busy = false;
        this.render();
      }
    }
    return false;
  }
  private render() {
    if (this.disposed || this.drag) return;
    const focused = (this.root.activeElement as HTMLElement | null)?.dataset
      .bookmarkId;
    if (!this.current()) this.selected = this.items[0]?.id ?? null;
    this.lane.replaceChildren();
    for (const item of [...this.items].sort((a, b) => a.start - b.start)) {
      if (item.start >= this.video.duration) continue;
      const node = button(
        this.video.ownerDocument,
        '',
        () => {
          if (!this.busy) {
            this.selected = item.id;
            this.render();
          }
        },
        this.lane
      );
      node.className = 'point';
      node.dataset.bookmarkId = item.id;
      node.setAttribute(
        'aria-label',
        `${item.name} at ${formatBookmarkTime(item.start)}`
      );
      node.setAttribute('aria-pressed', String(item.id === this.selected));
      node.style.left = `${(item.start / this.video.duration) * 100}%`;
      node.append(
        element(
          this.video.ownerDocument,
          'span',
          'point-label',
          `${formatBookmarkTime(item.start)} · ${item.name}`
        )
      );
      node.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || this.busy || !this.opened) return;
        event.preventDefault();
        this.selected = item.id;
        this.renderInspector();
        for (const point of this.lane.querySelectorAll('button'))
          point.setAttribute('aria-pressed', String(point === node));
        this.drag = {
          item: { ...item },
          x: event.clientX,
          pointer: event.pointerId,
          width: this.timeline.getBoundingClientRect().width,
          moved: false,
          created: false,
          start: item.start,
          originalPlaybackTime: this.video.currentTime,
          liveTuned: false,
        };
        this.setAltLiveTune(event.altKey);
        this.previewLiveTune();
        this.lane.dataset.dragging = 'true';
        node.focus();
      });
      node.addEventListener('keydown', (event) => {
        if (
          this.busy ||
          !this.opened ||
          !['ArrowLeft', 'ArrowRight'].includes(event.key)
        )
          return;
        event.preventDefault();
        this.selected = item.id;
        this.save({
          ...item,
          start: this.clamp(
            item.start +
              (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 0.1 : 1)
          ),
        });
      });
    }
    this.renderInspector();
    if (focused)
      [...this.lane.querySelectorAll<HTMLButtonElement>('.point')]
        .find((node) => node.dataset.bookmarkId === focused)
        ?.focus();
  }
  private renderInspector() {
    const changed =
      this.signature(this.items) !== this.signature(this.baseline);
    this.done.textContent = changed ? '✓ Done editing' : 'Close';
    this.done.dataset.changed = String(changed);
    this.done.setAttribute(
      'aria-label',
      changed ? 'Done editing' : 'Close editing'
    );
    this.done.title = changed
      ? 'Keep changes and finish editing'
      : 'Close editing';
    this.done.disabled = this.busy;
    this.discard.disabled = this.busy || !changed;
    this.clear.disabled = this.busy || !this.items.length;
    this.undo.disabled = this.busy || !this.undoStack.length;
    this.redo.disabled = this.busy || !this.redoStack.length;
    this.liveTune.disabled = this.busy;
    const ordered = this.orderedBookmarks();
    const index = ordered.findIndex((item) => item.id === this.selected);
    this.previous.disabled = this.busy || index <= 0;
    this.next.disabled = this.busy || index < 0 || index >= ordered.length - 1;
    const item = this.current();
    if (this.displayedId !== (item?.id ?? null)) {
      this.displayedId = item?.id ?? null;
      this.clearTimeError();
    }
    this.fields.hidden = !item;
    this.empty.hidden = Boolean(item);
    this.selectionCount.hidden = !item || index < 0;
    this.selectionCount.textContent =
      index >= 0 ? `${index + 1} of ${ordered.length}` : '';
    this.selectionCount.setAttribute(
      'aria-label',
      index >= 0
        ? `Selected bookmark ${index + 1} of ${ordered.length}`
        : 'No bookmark selected'
    );
    const heading = this.inspector.querySelector('h2');
    if (heading) heading.textContent = item ? 'Edit bookmark' : 'Bookmarks';
    if (item) {
      if (this.root.activeElement !== this.name) this.name.value = item.name;
      if (this.root.activeElement !== this.time && !this.timeError)
        this.time.value = formatBookmarkTime(item.start);
    }
    for (const control of this.fields.querySelectorAll<
      HTMLInputElement | HTMLButtonElement
    >('input,.inspector-actions button'))
      control.disabled = this.busy;
  }
  private move(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointer || !this.drag.width)
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const start = this.clamp(
      this.drag.item.start +
        ((event.clientX - this.drag.x) / this.drag.width) * this.video.duration
    );
    this.drag.moved ||= Math.abs(event.clientX - this.drag.x) > 2;
    this.drag.start = start;
    this.setAltLiveTune(event.altKey);
    this.previewLiveTune();
    const node = [...this.lane.querySelectorAll<HTMLElement>('.point')].find(
      (node) => node.dataset.bookmarkId === this.drag?.item.id
    );
    if (node) {
      node.style.left = `${(start / this.video.duration) * 100}%`;
      node.dataset.draftTime = String(start);
      const label = node.querySelector('.point-label');
      if (label)
        label.textContent = `${formatBookmarkTime(start)} · ${this.drag.item.name}`;
    }
    this.time.value = formatBookmarkTime(start);
  }
  private finish(event: PointerEvent) {
    if (!this.drag || event.pointerId !== this.drag.pointer) return;
    const drag = this.drag;
    const start = drag.start;
    this.stopLiveTuneDrag(drag);
    this.drag = null;
    this.lane.dataset.dragging = 'false';
    if (drag.created) {
      this.items = this.items.filter((item) => item.id !== drag.item.id);
      const ids = new Set(this.items.map((item) => item.id));
      this.dragClick = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      void this.mutate(async () => {
        await this.actions.onAdd(start);
        this.selected =
          this.items.find((item) => !ids.has(item.id))?.id ?? null;
      });
    } else if (drag.moved) {
      this.dragClick = true;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.save({ ...drag.item, start });
    }
  }
  private cancelDrag(restorePlayback = true) {
    if (!this.drag) return;
    if (restorePlayback) this.stopLiveTuneDrag(this.drag);
    else clearTimeout(this.liveTuneTimer);
    if (this.drag.created)
      this.items = this.items.filter((item) => item.id !== this.drag?.item.id);
    this.drag = null;
    this.lane.dataset.dragging = 'false';
    this.render();
  }
  cleanup() {
    this.close(false, false);
    this.hideFloatingWorkspace();
    this.reset();
    this.disposed = true;
    clearTimeout(this.closeTimer);
    clearTimeout(this.liveTuneTimer);
    for (const cleanup of this.cleanups) cleanup();
    this.host.remove();
  }
}
