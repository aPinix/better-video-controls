import { getMediaSeekRange } from './media';
import {
  flickMiniGeometry,
  MINI_PLAYER_CORNERS,
  type MiniPlayerCorner,
  resizeMiniGeometry,
} from './mini-player-geometry';
import {
  DEFAULT_MINI_PLAYER_GEOMETRY,
  MINI_PLAYER_GEOMETRY_KEY,
  type MiniPlayerGeometry,
  normalizeMiniPlayerGeometry,
} from './mini-player-settings';
import {
  formatTime,
  type LoopRange,
  remainingSeconds,
  seekVideo,
  skipVideo,
} from './player-actions';
import { clamp, type PlayerToolsSettings } from './player-tools-settings';
import { button, element, TOOLS_STYLES } from './player-tools-ui';
import {
  DEFAULT_YOUTUBE_PIP_SIZE,
  normalizeYouTubePipSize,
  type PipWindow,
  YOUTUBE_PIP_REQUEST,
  YOUTUBE_PIP_RESULT,
  YOUTUBE_PIP_SETTINGS_CHANGED,
  YOUTUBE_PIP_SIZE_KEY,
} from './youtube-pip';
import { controlYouTubePipWindow } from './youtube-pip-interaction';
import { createYouTubePipReturnArea } from './youtube-pip-return';

type Geometry = MiniPlayerGeometry;
export function clampMiniGeometry(
  g: Geometry,
  viewportWidth: number,
  viewportHeight: number,
  aspect: number,
  top = DEFAULT_MINI_PLAYER_GEOMETRY.y
): Geometry {
  const maxWidth = Math.max(
    1,
    Math.min(viewportWidth - 16, (viewportHeight - top - 8) * aspect)
  );
  const width = clamp(g.width, Math.min(240, maxWidth), maxWidth);
  return {
    width,
    x: clamp(g.x, 8, Math.max(8, viewportWidth - width - 8)),
    y: clamp(
      g.y,
      Math.min(top, Math.max(32, viewportHeight - width / aspect - 8)),
      Math.max(top, viewportHeight - width / aspect - 8)
    ),
  };
}
export class FloatingPlayer {
  private doc: Document;
  private win: Window;
  private overlayHost: HTMLElement;
  private root: ShadowRoot;
  private placeholder: HTMLElement | null = null;
  private player: HTMLElement | null = null;
  private restoreStyles: (() => void) | null = null;
  private bar: HTMLElement;
  private resizeHandles: HTMLButtonElement[];
  private miniAnimations: Animation[] = [];
  private miniEntering = false;
  private miniExitCleanup: (() => void) | null = null;
  private controls: HTMLElement;
  private miniStatus: HTMLElement;
  private play: HTMLButtonElement;
  private backward: HTMLButtonElement;
  private forward: HTMLButtonElement;
  private mute: HTMLButtonElement;
  private volume: HTMLInputElement;
  private seek: HTMLInputElement;
  private seekHint: HTMLElement;
  private seekDrag: { x: number; y: number; time: number } | null = null;
  private geometry: Geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY };
  private renderedGeometry: Geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY };
  private geometryReady = false;
  private suppressed = false;
  private pip: Window | null = null;
  private overridePip = false;
  private pipSize = { ...DEFAULT_YOUTUBE_PIP_SIZE };
  private pipSizeTimer = 0;
  private restorePip: (() => void) | null = null;
  private returnPip: (() => void) | null = null;
  private preservePipPlayback = false;
  private preserveNativePipPlayback = false;
  private nativePipActive = false;
  private automaticPip = false;
  private automaticPipSawHidden = false;
  private automaticPauseTimer: number | undefined;
  private closingPipExplicitly = false;
  private restoreNativePip: (() => void) | null = null;
  private disposed = false;
  private pendingPip = false;
  private generation = 0;
  private geometrySignature = '';
  private drag: {
    x: number;
    y: number;
    geometry: Geometry;
    corner: MiniPlayerCorner | null;
    pointerId: number;
    samples: Array<{ x: number; y: number; time: number }>;
  } | null = null;
  private cleanupEvents: Array<() => void> = [];

  constructor(
    private video: HTMLVideoElement,
    root: ShadowRoot,
    private settings: () => PlayerToolsSettings,
    private isYouTube: boolean,
    private report: (text: string) => void,
    private setSpeed: (speed: number) => void,
    private getLoop: () => { range: LoopRange | null; enabled: boolean },
    private onFloat: () => void = () => {}
  ) {
    this.doc = video.ownerDocument;
    this.win = this.doc.defaultView ?? window;
    this.overlayHost = root.host as HTMLElement;
    this.root = root;
    this.bar = element(this.doc, 'div', 'mini-bar');
    this.bar.hidden = true;
    this.bar.tabIndex = 0;
    this.bar.setAttribute('role', 'group');
    this.bar.setAttribute(
      'aria-label',
      'Move mini player. Use arrow keys; Shift for fine adjustments.'
    );
    const back = button(
      this.doc,
      'Back to top',
      () => {
        if (this.overridePip) {
          this.returnPip?.();
          return;
        }
        this.suppressed = true;
        this.restoreMini();
        this.win.scrollTo({ top: 0, behavior: 'smooth' });
      },
      this.bar
    );
    this.setIcon(back, 'Back to top', 'M5 19V5h14M5 5l14 14');
    back.className = 'mini-return';
    const close = button(
      this.doc,
      'Close',
      () => {
        if (this.overridePip) {
          this.closePip(true);
          return;
        }
        this.suppressed = true;
        this.restoreMini();
      },
      this.bar
    );
    this.setIcon(close, 'Close mini player', 'M6 6l12 12M18 6 6 18');
    close.className = 'mini-close';
    close.append(element(this.doc, 'span', '', 'Close'));
    this.controls = element(this.doc, 'div', 'mini-controls');
    this.controls.hidden = true;
    this.controls.setAttribute('role', 'group');
    this.controls.setAttribute('aria-label', 'Mini player playback controls');
    this.miniStatus = element(this.doc, 'p', 'mini-status');
    this.miniStatus.setAttribute('role', 'status');
    this.controls.append(this.miniStatus);
    const middle = element(this.doc, 'div', 'mini-middle');
    this.controls.append(middle);
    this.play = button(
      this.doc,
      'Play',
      () => {
        if (this.video.paused)
          void this.video
            .play()
            .catch(() => this.report('Playback could not start.'));
        else this.video.pause();
      },
      middle
    );
    this.backward = button(
      this.doc,
      'Seek backward',
      () => skipVideo(this.video, -this.settings().backward),
      middle
    );
    this.forward = button(
      this.doc,
      'Seek forward',
      () => skipVideo(this.video, this.settings().forward),
      middle
    );
    this.play.className = 'mini-play';
    this.backward.className = this.forward.className = 'mini-skip';
    middle.replaceChildren(this.backward, this.play, this.forward);
    const volumeControls = element(this.doc, 'div', 'mini-volume');
    this.controls.append(volumeControls);
    this.mute = button(
      this.doc,
      'Mute',
      () => {
        this.video.muted = !this.video.muted;
      },
      volumeControls
    );
    this.volume = element(this.doc, 'input');
    this.volume.type = 'range';
    this.volume.min = '0';
    this.volume.max = '1';
    this.volume.step = '.01';
    this.volume.setAttribute('aria-label', 'Mini player volume');
    volumeControls.append(this.volume);
    this.volume.addEventListener('input', () => {
      this.video.volume = this.volume.valueAsNumber;
      this.video.muted = this.video.volume === 0;
    });
    this.seek = element(this.doc, 'input', 'mini-seek');
    this.seek.type = 'range';
    this.seek.step = '.1';
    this.seek.setAttribute('aria-label', 'Mini player seek');
    this.seek.addEventListener('input', () =>
      seekVideo(this.video, this.seek.valueAsNumber)
    );
    this.controls.append(this.seek);
    this.seekHint = element(this.doc, 'p', 'mini-seek-hint');
    this.seekHint.hidden = true;
    this.controls.append(this.seekHint);
    this.resizeHandles = MINI_PLAYER_CORNERS.map((corner) => {
      const handle = element(this.doc, 'button', 'mini-resize');
      handle.dataset.corner = corner;
      handle.setAttribute('aria-label', `Resize mini player from ${corner}`);
      handle.hidden = true;
      return handle;
    });
    root.append(this.bar, this.controls, ...this.resizeHandles);
    const listen = (
      target: EventTarget,
      type: string,
      handler: EventListener,
      capture = false
    ) => {
      target.addEventListener(type, handler, capture);
      this.cleanupEvents.push(() =>
        target.removeEventListener(type, handler, capture)
      );
    };
    const start = (event: Event, corner: MiniPlayerCorner | null) => {
      const e = event as PointerEvent;
      if (
        this.overridePip ||
        !this.player ||
        this.drag ||
        e.button !== 0 ||
        (!corner && (e.target as Element).closest('button'))
      )
        return;
      e.preventDefault();
      this.cancelMiniAnimations();
      this.drag = {
        x: e.clientX,
        y: e.clientY,
        geometry: { ...this.renderedGeometry },
        corner,
        pointerId: e.pointerId,
        samples: [{ x: e.clientX, y: e.clientY, time: e.timeStamp }],
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        // Document listeners keep the gesture usable if capture is unavailable.
      }
    };
    listen(this.bar, 'pointerdown', (e) => start(e, null));
    for (const handle of this.resizeHandles)
      listen(handle, 'pointerdown', (e) =>
        start(e, handle.dataset.corner as MiniPlayerCorner)
      );
    for (const handle of this.resizeHandles)
      listen(handle, 'dblclick', (event) => {
        if (!this.player || this.overridePip) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.drag = null;
        this.cancelMiniAnimations();
        this.geometry = { ...DEFAULT_MINI_PLAYER_GEOMETRY };
        this.layoutMini();
        this.saveGeometry();
      });
    const move = (event: Event) => {
      const e = event as PointerEvent;
      if (!this.drag || this.drag.pointerId !== e.pointerId) return;
      const old = this.drag.geometry;
      this.geometry = this.drag.corner
        ? resizeMiniGeometry(
            old,
            this.drag.corner,
            e.clientX - this.drag.x,
            e.clientY - this.drag.y,
            this.miniAspect(),
            this.win.innerWidth,
            this.win.innerHeight,
            this.headerBottom() + 8
          )
        : {
            ...old,
            x: old.x + e.clientX - this.drag.x,
            y: old.y + e.clientY - this.drag.y,
          };
      this.layoutMini();
      this.geometry = { ...this.renderedGeometry };
      this.drag.samples.push({ x: e.clientX, y: e.clientY, time: e.timeStamp });
      this.drag.samples = this.drag.samples.filter(
        (sample) => e.timeStamp - sample.time <= 100
      );
    };
    const finish = (event: Event) => {
      const e = event as PointerEvent;
      if (!this.drag || this.drag.pointerId !== e.pointerId) return;
      const drag = this.drag;
      // Include a final release coordinate even when no move event preceded it.
      if (event.type === 'pointerup') move(event);
      this.drag = null;
      const first = drag.samples[0];
      const last = drag.samples[drag.samples.length - 1];
      const elapsed = first ? e.timeStamp - first.time : 0;
      if (
        event.type === 'pointerup' &&
        !drag.corner &&
        first &&
        last &&
        elapsed > 0 &&
        elapsed <= 100 &&
        Math.hypot(last.x - drag.x, last.y - drag.y) > 28
      ) {
        const vx = (last.x - first.x) / elapsed;
        const vy = (last.y - first.y) / elapsed;
        if (Math.hypot(vx, vy) >= 0.75) this.flickMini(vx, vy);
      }
      this.saveGeometry();
    };
    // Listen outside the handles too, so leaving the player never loses a drag.
    listen(this.win, 'pointermove', move, true);
    listen(this.win, 'pointerup', finish, true);
    listen(this.win, 'pointercancel', finish, true);
    for (const node of [this.bar, ...this.resizeHandles]) {
      listen(node, 'lostpointercapture', finish);
      listen(node, 'keydown', (event) => {
        const e = event as KeyboardEvent;
        if (
          this.overridePip ||
          e.target !== node ||
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        this.cancelMiniAnimations();
        const delta =
          (e.shiftKey ? 1 : 10) *
          (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1);
        this.geometry = { ...this.renderedGeometry };
        if (node !== this.bar)
          this.geometry = resizeMiniGeometry(
            this.geometry,
            node.dataset.corner as MiniPlayerCorner,
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? delta : 0,
            e.key === 'ArrowUp' || e.key === 'ArrowDown'
              ? delta / this.miniAspect()
              : 0,
            this.miniAspect(),
            this.win.innerWidth,
            this.win.innerHeight,
            this.headerBottom() + 8
          );
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
          this.geometry.x += delta;
        else this.geometry.y += delta;
        this.layoutMini();
        this.geometry = { ...this.renderedGeometry };
      });
      listen(node, 'keyup', (event) => {
        if (this.overridePip) return;
        if (
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(
            (event as KeyboardEvent).key
          )
        )
          this.saveGeometry();
      });
    }
    for (const type of [
      'play',
      'pause',
      'volumechange',
      'durationchange',
      'loadedmetadata',
      'resize',
      'timeupdate',
      'progress',
      'seeked',
      'enterpictureinpicture',
      'leavepictureinpicture',
    ])
      listen(video, type, () => {
        this.update();
        this.syncControls();
      });
    listen(video, 'enterpictureinpicture', () => {
      this.nativePipActive = true;
      if (!this.isYouTube || this.settings().youtubePipOverride) return;
      this.restoreNativePip?.();
      const { area, button } = createYouTubePipReturnArea(
        this.doc,
        () => {
          button.disabled = true;
          this.preserveNativePipPlayback = true;
          void this.doc.exitPictureInPicture().catch(() => {
            this.preserveNativePipPlayback = false;
            button.disabled = false;
          });
        },
        true
      );
      (
        video.closest('.html5-video-player, #movie_player') ??
        video.parentElement
      )?.append(area);
      this.restoreNativePip = () => {
        area.remove();
        this.restoreNativePip = null;
      };
      this.onFloat();
    });
    listen(video, 'leavepictureinpicture', () => {
      this.restoreNativePip?.();
      if (
        this.nativePipActive &&
        !this.preserveNativePipPlayback &&
        !this.disposed
      )
        this.video.pause();
      this.nativePipActive = false;
      this.preserveNativePipPlayback = false;
    });
    const keyboardMode = (enabled: boolean) => {
      for (const node of [this.bar, this.controls, ...this.resizeHandles])
        node.dataset.keyboard = String(enabled);
    };
    listen(this.doc, 'keydown', () => keyboardMode(true));
    listen(this.doc, 'pointerdown', () => keyboardMode(false));
    if (this.isYouTube) {
      listen(this.doc, 'visibilitychange', () => {
        if (!this.automaticPip) return;
        if (this.doc.hidden) this.automaticPipSawHidden = true;
        else if (this.automaticPipSawHidden) {
          if (this.pendingPip) this.generation++;
          this.closePip();
        }
      });
      listen(video, YOUTUBE_PIP_REQUEST, (event) => {
        if (video.dataset.mfsPipOverride !== 'true') return;
        event.preventDefault();
        void this.openPip(video.dataset.mfsPipAutomaticRequest === 'true').then(
          () => {
            delete video.dataset.mfsPipError;
            video.dispatchEvent(new Event(YOUTUBE_PIP_RESULT));
          },
          (error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : 'Could not open Picture-in-Picture.';
            video.dataset.mfsPipError = message;
            video.dispatchEvent(new Event(YOUTUBE_PIP_RESULT));
            this.report(message);
          }
        );
      });
    }
    listen(this.seek, 'pointerdown', (event) => {
      const e = event as PointerEvent;
      const range = getMediaSeekRange(this.video);
      if (e.button !== 0 || !range) return;
      e.preventDefault();
      const rect = this.seek.getBoundingClientRect();
      const time =
        range.start +
        clamp((e.clientX - rect.left) / rect.width, 0, 1) *
          (range.end - range.start);
      seekVideo(this.video, time);
      this.seekDrag = { x: e.clientX, y: e.clientY, time };
      this.seek.setPointerCapture?.(e.pointerId);
      this.controls.dataset.seeking = 'true';
      this.seekHint.textContent = 'Drag upwards to seek precisely';
      this.seekHint.hidden = false;
      this.syncControls();
    });
    listen(this.seek, 'pointermove', (event) => {
      if (!this.seekDrag) return;
      const e = event as PointerEvent;
      const range = getMediaSeekRange(this.video);
      if (!range) return;
      const upwards = Math.max(0, this.seekDrag.y - e.clientY);
      const sensitivity = 1 / (1 + upwards / 24);
      const delta =
        ((e.clientX - this.seekDrag.x) /
          this.seek.getBoundingClientRect().width) *
        (range.end - range.start) *
        sensitivity;
      this.seekDrag.time = clamp(
        this.seekDrag.time + delta,
        range.start,
        range.end
      );
      this.seekDrag.x = e.clientX;
      seekVideo(this.video, this.seekDrag.time);
      this.seekHint.textContent =
        upwards >= 24 ? 'Precise seeking' : 'Drag upwards to seek precisely';
      this.syncControls();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      listen(this.seek, type, () => {
        this.seekDrag = null;
        this.controls.dataset.seeking = 'false';
        this.seekHint.hidden = true;
      });
    const storageChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (
        area === 'local' &&
        changes[MINI_PLAYER_GEOMETRY_KEY] &&
        !this.disposed &&
        !this.drag
      ) {
        this.geometry = normalizeMiniPlayerGeometry(
          changes[MINI_PLAYER_GEOMETRY_KEY].newValue
        );
        this.update();
      }
    };
    chrome.storage.onChanged?.addListener(storageChanged);
    this.cleanupEvents.push(() =>
      chrome.storage.onChanged?.removeListener(storageChanged)
    );
    void chrome.storage.local
      .get([MINI_PLAYER_GEOMETRY_KEY, YOUTUBE_PIP_SIZE_KEY])
      .then((data) => {
        if (!this.disposed)
          this.geometry = normalizeMiniPlayerGeometry(
            data[MINI_PLAYER_GEOMETRY_KEY]
          );
        if (!this.disposed)
          this.pipSize = normalizeYouTubePipSize(data[YOUTUBE_PIP_SIZE_KEY]);
      })
      .catch(() => {})
      .finally(() => {
        if (!this.disposed) {
          this.geometryReady = true;
          this.update();
        }
      });
  }
  private setIcon(node: HTMLButtonElement, label: string, path: string): void {
    node.title = label;
    node.setAttribute('aria-label', label);
    const svg = this.doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const shape = this.doc.createElementNS(svg.namespaceURI, 'path');
    shape.setAttribute('d', path);
    svg.append(shape);
    node.replaceChildren(svg);
  }
  private syncControls(): void {
    this.setIcon(
      this.play,
      this.video.paused ? 'Play' : 'Pause',
      this.video.paused
        ? 'M3 3Q3 1 5 2l17 9q2 1 0 2L5 22q-2 1-2-1Z'
        : 'M8 3v18M16 3v18'
    );
    this.setIcon(
      this.backward,
      `Seek backward ${this.settings().backward} seconds`,
      'M9 4a8 8 0 1 0 6 0'
    );
    this.setIcon(
      this.forward,
      `Seek forward ${this.settings().forward} seconds`,
      'M15 4a8 8 0 1 1-6 0'
    );
    for (const [node, interval] of [
      [this.backward, this.settings().backward],
      [this.forward, this.settings().forward],
    ] as const) {
      const arrow = this.doc.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      );
      arrow.setAttribute(
        'd',
        node === this.backward ? 'M13 0 6 4l7 4Z' : 'M11 0l7 4-7 4Z'
      );
      arrow.setAttribute('fill', 'currentColor');
      arrow.setAttribute('stroke', 'none');
      node.querySelector('svg')?.append(arrow);
      const text = this.doc.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      text.setAttribute('x', '12');
      text.setAttribute('y', '12');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', 'currentColor');
      text.setAttribute('stroke', 'none');
      text.setAttribute(
        'font-size',
        String(Math.min(8, 24 / String(interval).length))
      );
      text.setAttribute('font-weight', '700');
      text.textContent = String(interval);
      node.querySelector('svg')?.append(text);
    }
    this.setIcon(
      this.mute,
      this.video.muted ? 'Unmute' : 'Mute',
      `M11 5 6 9H3v6h3l5 4V5Z${this.video.muted ? 'm16 9 5 6m0-6-5 6' : 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14'}`
    );
    this.volume.value = String(this.video.muted ? 0 : this.video.volume);
    const volumePercentage = this.video.muted ? 0 : this.video.volume * 100;
    this.volume.style.setProperty(
      '--seek-background',
      `linear-gradient(to right,#fff ${volumePercentage}%,#ffffff55 ${volumePercentage}%)`
    );
    const range = getMediaSeekRange(this.video);
    this.seek.disabled = !range;
    if (range) {
      this.seek.min = String(range.start);
      this.seek.max = String(range.end);
      this.seek.value = String(this.video.currentTime);
      this.seek.setAttribute(
        'aria-valuetext',
        `${formatTime(this.video.currentTime)} of ${formatTime(range.end)}`
      );
      const percentage = clamp(
        ((this.video.currentTime - range.start) / (range.end - range.start)) *
          100,
        0,
        100
      );
      this.seek.style.setProperty(
        '--seek-background',
        `linear-gradient(to right,#fff ${percentage}%,#ffffff55 ${percentage}%)`
      );
    }
  }
  private saveGeometry(): void {
    this.miniStatus.textContent = '';
    void chrome.storage.local
      .set({ [MINI_PLAYER_GEOMETRY_KEY]: { ...this.geometry } })
      .catch(() => {
        if (this.disposed) return;
        this.miniStatus.textContent =
          'Could not save mini player position and size.';
        this.report(this.miniStatus.textContent);
      });
  }
  private headerBottom(): number {
    const header = this.doc.querySelector('ytd-masthead, #masthead-container');
    return Math.max(0, header?.getBoundingClientRect().bottom || 64);
  }
  get inMini(): boolean {
    return this.player !== null;
  }
  get inPip(): boolean {
    return Boolean(
      this.pip ||
        this.pendingPip ||
        this.doc.pictureInPictureElement === this.video
    );
  }
  update(): void {
    if (this.disposed) return;
    this.updatePipOverride();
    if (
      !this.isYouTube ||
      this.doc.location.pathname !== '/watch' ||
      !this.video.isConnected ||
      !this.settings().miniPlayer ||
      this.inPip ||
      this.doc.fullscreenElement ||
      this.video
        .closest('#movie_player')
        ?.matches('.ad-showing,.ad-interrupting')
    ) {
      this.restoreMini(false);
      return;
    }
    const anchor =
      this.placeholder ?? this.video.closest('#movie_player') ?? this.video;
    const rect = anchor.getBoundingClientRect();
    const outside = rect.bottom <= this.headerBottom();
    if (!outside) {
      this.suppressed = false;
      this.restoreMini();
      return;
    }
    if (this.suppressed || !this.geometryReady) return;
    if (!this.player && !this.video.paused) this.startMini();
    this.layoutMini();
    this.syncControls();
  }
  private updatePipOverride(): void {
    if (!this.isYouTube) return;
    const mode = this.settings().youtubePipOverride
      ? 'mini-player'
      : 'chrome-video';
    const enabled =
      this.settings().youtubePipOverride &&
      this.doc.location.pathname === '/watch' &&
      this.video.isConnected &&
      !this.doc.fullscreenElement &&
      (this.inPip ||
        !this.doc.querySelector(
          '#movie_player.ad-showing,#movie_player.ad-interrupting'
        )) &&
      (mode === 'chrome-video'
        ? this.doc.pictureInPictureEnabled
        : Boolean((this.win as PipWindow).documentPictureInPicture)) &&
      this.win === this.win.top;
    const auto = enabled && this.settings().youtubePipAutoOnTabChange;
    if (
      this.video.dataset.mfsPipOverride === String(enabled) &&
      this.video.dataset.mfsPipAuto === String(auto) &&
      this.video.dataset.mfsPipMode === mode
    )
      return;
    const previousMode = this.video.dataset.mfsPipMode;
    this.video.dataset.mfsPipOverride = String(enabled);
    this.video.dataset.mfsPipAuto = String(auto);
    this.video.dataset.mfsPipMode = mode;
    this.doc.dispatchEvent(new Event(YOUTUBE_PIP_SETTINGS_CHANGED));
    if ((!enabled || mode === 'chrome-video') && this.overridePip) this.reset();
    if (
      previousMode === 'chrome-video' &&
      (!enabled || mode !== previousMode) &&
      this.doc.pictureInPictureElement === this.video
    ) {
      this.preserveNativePipPlayback = true;
      void this.doc.exitPictureInPicture().catch(() => {
        this.preserveNativePipPlayback = false;
      });
    }
  }
  private startMini(): void {
    const player = this.video.closest<HTMLElement>('#movie_player');
    if (!player || player.matches('.ad-showing,.ad-interrupting')) return;
    this.player = player;
    this.miniExitCleanup?.();
    this.miniEntering = true;
    this.onFloat();
    const rect = player.getBoundingClientRect();
    this.placeholder = element(this.doc, 'div');
    this.placeholder.style.height = `${rect.height}px`;
    this.placeholder.style.width = '100%';
    player.before(this.placeholder);
    const snapshots: Array<{
      element: HTMLElement;
      property: string;
      value: string;
      priority: string;
    }> = [];
    const preserve = (element: HTMLElement, properties: string[]) => {
      for (const property of properties)
        snapshots.push({
          element,
          property,
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        });
    };
    preserve(player, [
      'position',
      'left',
      'top',
      'width',
      'height',
      'z-index',
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'max-width',
      'max-height',
      'border-radius',
      'box-shadow',
      'overflow',
      'border',
      'padding',
      ...['top', 'right', 'bottom', 'left'].flatMap((side) => [
        `border-${side}-width`,
        `border-${side}-style`,
        `border-${side}-color`,
        `padding-${side}`,
      ]),
      'border-image',
    ]);
    preserve(this.video, [
      'width',
      'height',
      'max-width',
      'max-height',
      'left',
      'top',
      'object-fit',
    ]);
    const videoContainer = this.video.closest<HTMLElement>(
      '.html5-video-container'
    );
    if (videoContainer) {
      preserve(videoContainer, [
        'width',
        'height',
        'max-width',
        'max-height',
        'left',
        'top',
      ]);
      videoContainer.style.setProperty('width', '100%', 'important');
      videoContainer.style.setProperty('height', '100%', 'important');
    }
    for (const [property, value] of Object.entries({
      width: '100%',
      height: '100%',
      'max-width': 'none',
      'max-height': 'none',
      left: '0',
      top: '0',
      'object-fit': 'cover',
    }))
      this.video.style.setProperty(property, value, 'important');
    let restoreLayers = () => {};
    let promoted = false;
    // The browser top layer keeps the same DOM/video nodes while escaping
    // YouTube's clipping and stacking, without raising the full-size backdrop.
    if (
      typeof player.showPopover === 'function' &&
      typeof this.overlayHost.showPopover === 'function' &&
      !player.hasAttribute('popover') &&
      !this.overlayHost.hasAttribute('popover')
    ) {
      const host = this.overlayHost;
      const originalHostStyle = host.getAttribute('style');
      for (const [property, value] of Object.entries({
        margin: '0',
        border: '0',
        padding: '0',
        width: '100vw',
        height: '100vh',
        background: 'transparent',
      }))
        host.style.setProperty(property, value, 'important');
      player.setAttribute('popover', 'manual');
      host.setAttribute('popover', 'manual');
      const releasePromotion = () => {
        for (const node of [host, player]) {
          try {
            node.hidePopover();
          } catch {
            // Navigation may have already disconnected or closed the popover.
          }
          node.removeAttribute('popover');
        }
        if (originalHostStyle === null) host.removeAttribute('style');
        else host.setAttribute('style', originalHostStyle);
      };
      try {
        player.showPopover();
        host.showPopover();
        promoted = true;
        restoreLayers = releasePromotion;
      } catch {
        releasePromotion();
      }
    }
    // Fallback for browsers without the top-layer API: escape ancestor contexts.
    // Escape ancestor stacking/containing contexts instead of raising their
    // full-size backgrounds above the header at the scroll transition.
    for (
      let ancestor = player.parentElement;
      !promoted && ancestor && ancestor !== this.doc.documentElement;
      ancestor = ancestor.parentElement
    ) {
      const style = this.win.getComputedStyle(ancestor);
      if (
        ['overflow-x', 'overflow-y'].some((property) =>
          ['hidden', 'clip'].includes(style.getPropertyValue(property))
        )
      ) {
        preserve(ancestor, ['overflow', 'overflow-x', 'overflow-y']);
        ancestor.style.setProperty('overflow', 'visible', 'important');
      }
      for (const [property, neutral] of Object.entries({
        'z-index': 'auto',
        transform: 'none',
        perspective: 'none',
        filter: 'none',
        'backdrop-filter': 'none',
        contain: 'none',
        'will-change': 'auto',
        isolation: 'auto',
      })) {
        const value = style.getPropertyValue(property);
        if (!value || value === neutral || value === 'normal') continue;
        preserve(ancestor, [property]);
        ancestor.style.setProperty(property, neutral, 'important');
      }
    }
    const playerHost = player.closest<HTMLElement>('ytd-player');
    if (playerHost) {
      preserve(playerHost, ['overflow']);
      playerHost.style.setProperty('overflow', 'visible', 'important');
    }
    player.dataset.mfsMini = 'true';
    this.doc.documentElement.dataset.mfsMiniPlayerActive = 'true';
    this.restoreStyles = () => {
      restoreLayers();
      for (const { element, property, value, priority } of snapshots) {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      }
      delete player.dataset.mfsMini;
      delete this.doc.documentElement.dataset.mfsMiniPlayerActive;
    };
    for (const node of [this.bar, this.controls, ...this.resizeHandles])
      node.hidden = false;
  }
  private miniAspect(): number {
    return this.video.videoWidth && this.video.videoHeight
      ? this.video.videoWidth / this.video.videoHeight
      : 16 / 9;
  }
  private cancelMiniAnimations(): void {
    for (const animation of this.miniAnimations) animation.cancel();
    this.miniAnimations = [];
  }
  private miniMotionAllowed(): boolean {
    return !this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
  private animateMiniEntry(): void {
    if (!this.miniMotionAllowed()) return;
    for (const node of [this.player, this.bar, this.controls]) {
      if (node?.animate)
        this.miniAnimations.push(
          node.animate(
            [
              { opacity: 0, filter: 'blur(6px)' },
              { opacity: 1, filter: 'blur(0px)' },
            ],
            { duration: 180, easing: 'ease-out' }
          )
        );
    }
  }
  private animateMiniExit(): void {
    if (
      !this.player?.animate ||
      !this.miniMotionAllowed() ||
      this.video.readyState < 2 ||
      !this.video.videoWidth ||
      !this.video.videoHeight
    )
      return;
    const canvas = this.doc.createElement('canvas');
    const pixels = Math.min(2, this.win.devicePixelRatio || 1);
    canvas.width = Math.max(
      1,
      Math.round(this.renderedGeometry.width * pixels)
    );
    canvas.height = Math.max(1, Math.round(canvas.width / this.miniAspect()));
    try {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(this.video, 0, 0, canvas.width, canvas.height);
    } catch {
      // A frame that cannot be captured must never delay restoring playback.
      return;
    }
    const ghost = element(this.doc, 'div');
    ghost.dataset.mfsMiniExit = 'true';
    ghost.setAttribute('aria-hidden', 'true');
    const { x, y, width } = this.renderedGeometry;
    ghost.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${width}px;height:${width / this.miniAspect()}px;margin:0;border:0;padding:0;border-radius:8px;overflow:hidden;pointer-events:none;z-index:2147483647;background:transparent;box-shadow:${this.player.style.boxShadow}`;
    canvas.style.cssText =
      'display:block;width:100%;height:100%;object-fit:cover';
    canvas.style.filter = this.win.getComputedStyle(this.video).filter;
    ghost.append(canvas);
    this.doc.body.append(ghost);
    if (typeof ghost.showPopover === 'function') {
      ghost.setAttribute('popover', 'manual');
      try {
        ghost.showPopover();
      } catch {
        ghost.removeAttribute('popover');
      }
    }
    const animation = ghost.animate(
      [
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: 'blur(6px)' },
      ],
      { duration: 160, easing: 'ease-out' }
    );
    const remove = () => {
      animation.cancel();
      ghost.remove();
      if (this.miniExitCleanup === remove) this.miniExitCleanup = null;
    };
    this.miniExitCleanup = remove;
    // The temporary frame fades away while the same video resumes its layout.
    void animation.finished.then(remove, remove);
  }
  private flickMini(vx: number, vy: number): void {
    const from = this.renderedGeometry;
    this.geometry = flickMiniGeometry(
      from,
      vx,
      vy,
      this.miniAspect(),
      this.win.innerWidth,
      this.win.innerHeight,
      this.headerBottom() + 8
    );
    this.layoutMini();
    this.geometry = { ...this.renderedGeometry };
    if (this.win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      return;
    const dx = from.x - this.renderedGeometry.x;
    const dy = from.y - this.renderedGeometry.y;
    // Commit the destination once; only composite transforms during the snap.
    this.cancelMiniAnimations();
    for (const node of [
      this.player,
      this.bar,
      this.controls,
      ...this.resizeHandles,
    ]) {
      if (node?.animate)
        this.miniAnimations.push(
          node.animate(
            [
              { transform: `translate(${dx}px,${dy}px)` },
              { transform: 'translate(0,0)' },
            ],
            { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
          )
        );
    }
  }
  private layoutMini(): void {
    if (!this.player) return;
    // YouTube rewrites media dimensions after its own resize observer runs.
    // Keep the existing media fitted to our container without reloading it.
    const container = this.video.closest<HTMLElement>('.html5-video-container');
    for (const node of [this.video, container]) {
      if (!node) continue;
      for (const [property, value] of Object.entries({
        width: '100%',
        height: '100%',
        'max-width': 'none',
        'max-height': 'none',
        left: '0px',
        top: '0px',
        ...(node === this.video ? { 'object-fit': 'cover' } : {}),
      })) {
        if (
          node.style.getPropertyValue(property) !== value ||
          node.style.getPropertyPriority(property) !== 'important'
        )
          node.style.setProperty(property, value, 'important');
      }
    }
    const aspect = this.miniAspect();
    this.renderedGeometry = clampMiniGeometry(
      this.geometry,
      this.win.innerWidth,
      this.win.innerHeight,
      aspect,
      this.headerBottom() + 8
    );
    const { x, y, width } = this.renderedGeometry;
    const height = width / aspect;
    const signature = `${x}:${y}:${width}:${height}`;
    if (signature === this.geometrySignature) return;
    this.geometrySignature = signature;
    for (const [key, value] of Object.entries({
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      'z-index': '2147483645',
      margin: '0',
      'max-width': 'none',
      'max-height': 'none',
      'border-radius': '8px',
      'box-shadow': '0 8px 32px rgb(0 0 0 / .24), 0 2px 8px rgb(0 0 0 / .16)',
      overflow: 'hidden',
      border: '0',
      padding: '0',
    }))
      this.player.style.setProperty(key, value, 'important');
    this.bar.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;--mini-scale:${width / 310};--mini-inset:8px;--mini-button-size:24px;--mini-icon-size:14px;--mini-font-size:11px;--mini-button-gap:3px;--mini-button-padding:6px`;
    for (const handle of this.resizeHandles) {
      const corner = handle.dataset.corner as MiniPlayerCorner;
      handle.style.cssText = `left:${x + (corner.endsWith('left') ? 0 : width - 12)}px;top:${y + (corner.startsWith('top') ? 0 : height - 12)}px`;
    }
    this.controls.style.cssText = `left:${x}px;top:${y}px;width:${width}px;height:${height}px;--mini-scale:${width / 310}`;
    if (this.miniEntering) {
      this.miniEntering = false;
      this.animateMiniEntry();
    }
  }
  restoreMini(animate = true): void {
    this.cancelMiniAnimations();
    if (!this.player) return;
    if (animate) this.animateMiniExit();
    this.miniEntering = false;
    this.restoreStyles?.();
    this.restoreStyles = null;
    this.placeholder?.remove();
    this.placeholder = null;
    this.player = null;
    this.drag = null;
    this.seekDrag = null;
    this.controls.dataset.seeking = 'false';
    this.seekHint.hidden = true;
    this.geometrySignature = '';
    for (const node of [this.bar, this.controls, ...this.resizeHandles])
      node.hidden = true;
  }
  async openPip(automatic = false): Promise<Window | undefined> {
    if (this.disposed) return;
    if (this.inPip) return this.pip ?? undefined;
    this.win.clearTimeout(this.automaticPauseTimer);
    this.restoreMini(false);
    const generation = this.generation;
    const api = (this.win as PipWindow).documentPictureInPicture;
    const override = this.isYouTube && this.settings().youtubePipOverride;
    if (override && (!api || this.win !== this.win.top))
      throw new Error(
        'Custom Picture-in-Picture is unavailable in this browser.'
      );
    this.automaticPip = automatic;
    this.automaticPipSawHidden = automatic && this.doc.hidden;
    if (!api || this.win !== this.win.top || (this.isYouTube && !override)) {
      if (
        !this.doc.pictureInPictureEnabled ||
        !this.video.requestPictureInPicture
      )
        throw new Error('Picture-in-Picture is unavailable for this player.');
      this.pendingPip = true;
      try {
        await this.video.requestPictureInPicture();
      } finally {
        this.pendingPip = false;
      }
      if (this.disposed || generation !== this.generation) {
        if (this.doc.pictureInPictureElement === this.video)
          await this.doc.exitPictureInPicture();
        return;
      }
      this.report(
        'Native PiP is active; this browser provides its own controls.'
      );
      return;
    }
    this.pendingPip = true;
    this.overridePip = override;
    let pip: Window;
    try {
      pip = await api.requestWindow(
        override
          ? {
              width: this.pipSize.width,
              height: this.pipSize.height,
              preferInitialWindowPlacement: false,
            }
          : { width: 560, height: 400 }
      );
    } catch (error) {
      this.overridePip = false;
      this.automaticPip = this.automaticPipSawHidden = false;
      this.update();
      throw error;
    } finally {
      this.pendingPip = false;
    }
    if (this.disposed || generation !== this.generation) {
      pip.close();
      this.overridePip = false;
      this.automaticPip = this.automaticPipSawHidden = false;
      return;
    }
    this.pip = pip;
    this.onFloat();
    const video = this.video;
    const marker = this.doc.createComment('mfs-pip-video');
    video.before(marker);
    const style = video.getAttribute('style');
    const wasPlaying = !video.paused;
    const host = element(pip.document, 'div');
    pip.document.body.style.cssText = 'margin:0;background:#000;color:#fff';
    // Source-page overlays may follow the moved video through their portal.
    // PiP owns its own controls; keep those source overlays out of this window.
    const sourceOverlayStyle = pip.document.createElement('style');
    sourceOverlayStyle.textContent =
      '.scrub-wrapper,.mfs-media-controls,.mfs-seekbar-thumbnail-preview,.mfs-youtube-chapter-tooltip,.mfs-seek-speed-label{display:none!important}';
    pip.document.head.append(sourceOverlayStyle);
    pip.document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const css = element(pip.document, 'style');
    css.textContent = TOOLS_STYLES;
    shadow.append(css);
    video.dataset.mfsPip = 'true';
    shadow.append(video);
    video.style.cssText =
      'display:block;width:100%;height:calc(100vh - 112px);object-fit:contain';
    if (style) {
      const original = this.doc.createElement('div');
      original.setAttribute('style', style);
      video.style.filter = original.style.filter;
    }
    if (override) {
      this.setupOverridePip(pip, shadow, marker, style, wasPlaying);
      return pip;
    }
    const controls = element(pip.document, 'div', 'pip-controls');
    shadow.append(controls);
    const play = button(
      pip.document,
      'Play / pause',
      () => {
        if (video.paused)
          void video
            .play()
            .catch(() => this.report('Playback could not start.'));
        else video.pause();
      },
      controls
    );
    button(
      pip.document,
      'Rewind',
      () => skipVideo(video, -this.settings().backward),
      controls
    );
    button(
      pip.document,
      'Forward',
      () => skipVideo(video, this.settings().forward),
      controls
    );
    const seek = element(pip.document, 'input');
    seek.type = 'range';
    seek.min = '0';
    seek.step = '.1';
    seek.setAttribute('aria-label', 'Seek');
    controls.append(seek);
    seek.oninput = () => seekVideo(video, seek.valueAsNumber);
    const volume = element(pip.document, 'input');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '1';
    volume.step = '.01';
    volume.setAttribute('aria-label', 'Volume');
    controls.append(volume);
    volume.oninput = () => {
      video.volume = volume.valueAsNumber;
      video.muted = video.volume === 0;
    };
    const speed = element(pip.document, 'input');
    speed.type = 'number';
    speed.min = '.25';
    speed.max = '4';
    speed.step = '.05';
    speed.setAttribute('aria-label', 'Playback speed');
    controls.append(speed);
    speed.onchange = () => {
      if (speed.checkValidity()) this.setSpeed(speed.valueAsNumber);
    };
    const remaining = element(pip.document, 'span');
    controls.append(remaining);
    const loopButton = button(
      pip.document,
      'Toggle loop',
      () =>
        this.doc.dispatchEvent(
          new CustomEvent('mfs-toggle-active-loop', { detail: video })
        ),
      controls
    );
    button(pip.document, 'Back to tab', () => this.closePip(), controls);
    const sync = () => {
      const activeLoop = this.getLoop();
      loopButton.disabled = !activeLoop.range;
      loopButton.textContent = activeLoop.range
        ? `${activeLoop.enabled ? 'Disable' : 'Enable'} loop ${formatTime(activeLoop.range.start)}–${formatTime(activeLoop.range.end)}`
        : 'No active loop';
      play.textContent = video.paused ? 'Play' : 'Pause';
      seek.max = String(Number.isFinite(video.duration) ? video.duration : 0);
      seek.disabled = !Number.isFinite(video.duration);
      seek.value = String(video.currentTime);
      volume.value = String(video.muted ? 0 : video.volume);
      if (shadow.activeElement !== speed)
        speed.value = String(video.playbackRate);
      const left = remainingSeconds(
        video.duration,
        video.currentTime,
        video.playbackRate
      );
      remaining.textContent = left === null ? '' : `${formatTime(left)} left`;
    };
    for (const event of [
      'timeupdate',
      'volumechange',
      'ratechange',
      'play',
      'pause',
    ])
      video.addEventListener(event, sync);
    sync();
    if (wasPlaying) void video.play().catch(() => {});
    const restore = () => {
      if (!this.restorePip) return;
      this.restorePip = null;
      for (const event of [
        'timeupdate',
        'volumechange',
        'ratechange',
        'play',
        'pause',
      ])
        video.removeEventListener(event, sync);
      const playing = this.restorePipVideo(marker, style);
      this.pip = null;
      this.finishPipPlayback(playing);
      video.dispatchEvent(new Event('timeupdate'));
      this.win.dispatchEvent(new Event('resize'));
    };
    this.restorePip = restore;
    pip.addEventListener('pagehide', restore, { once: true });
    return pip;
  }
  private setupOverridePip(
    pip: Window,
    shadow: ShadowRoot,
    marker: Comment,
    originalStyle: string | null,
    wasPlaying: boolean
  ): void {
    const video = this.video;
    for (const node of [pip.document.documentElement, pip.document.body]) {
      Object.assign(node.style, {
        width: '100%',
        height: '100%',
        overflow: 'clip',
        overscrollBehavior: 'none',
      });
    }
    (shadow.host as HTMLElement).style.cssText =
      'position:fixed;inset:0;display:block;overflow:clip';
    const { area: returnArea } = createYouTubePipReturnArea(this.doc, () =>
      this.returnPip?.()
    );
    (
      marker.parentElement?.closest('.html5-video-player, #movie_player') ??
      marker.parentElement
    )?.append(returnArea);
    video.style.position = 'fixed';
    video.style.left = video.style.top = '0';
    video.style.transform = 'none';
    video.style.width = video.style.height = '100%';
    const css = element(pip.document, 'style');
    css.textContent =
      ':host{display:block}video[data-mfs-pip=true]{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;transform:none!important;object-fit:contain!important}.mini-bar,.mini-controls{border-radius:0;inset:0;width:100%;height:100%;transform:none}';
    shadow.append(css, this.bar, this.controls, ...this.resizeHandles);
    this.bar.hidden = this.controls.hidden = false;
    for (const handle of this.resizeHandles) handle.hidden = true;
    this.bar.setAttribute(
      'aria-label',
      'Move Picture-in-Picture. Drag anywhere on the video.'
    );
    const releaseWindowControls = controlYouTubePipWindow(
      pip,
      this.bar,
      (message) => {
        this.miniStatus.textContent = message;
      }
    );
    const back = this.bar.querySelector<HTMLButtonElement>('.mini-return');
    const close = this.bar.querySelector<HTMLButtonElement>('.mini-close');
    back?.setAttribute('aria-label', 'Back to tab');
    if (back) back.title = 'Back to tab';
    close?.setAttribute('aria-label', 'Close Picture-in-Picture');
    if (close) close.title = 'Close Picture-in-Picture';
    const layout = () => {
      for (const node of [this.bar, this.controls])
        node.style.cssText = '--mini-scale:1';
      this.syncControls();
    };
    const saveSize = () => {
      this.pipSize = normalizeYouTubePipSize({
        width: pip.innerWidth,
        height: pip.innerHeight,
      });
      void chrome.storage.local
        .set({ [YOUTUBE_PIP_SIZE_KEY]: { ...this.pipSize } })
        .catch(() => {
          if (!this.disposed)
            this.miniStatus.textContent =
              'Could not save Picture-in-Picture size.';
        });
    };
    const resized = () => {
      layout();
      pip.clearTimeout(this.pipSizeTimer);
      this.pipSizeTimer = pip.setTimeout(saveSize, 200);
    };
    const keyboard = () => {
      this.bar.dataset.keyboard = this.controls.dataset.keyboard = 'true';
    };
    const pointer = () => {
      this.bar.dataset.keyboard = this.controls.dataset.keyboard = 'false';
    };
    this.returnPip = () => {
      if (this.pip !== pip) return;
      const destination = marker.parentElement;
      const bounds = destination?.getBoundingClientRect();
      if (
        bounds &&
        (bounds.top < this.headerBottom() ||
          bounds.bottom > this.win.innerHeight ||
          bounds.left < 0 ||
          bounds.right > this.win.innerWidth)
      )
        destination?.scrollIntoView?.({
          block: 'center',
          inline: 'nearest',
          behavior: 'instant',
        });
      // Focusing the tab can make Chrome close automatic PiP immediately.
      this.preservePipPlayback = true;
      try {
        this.win.focus();
        this.closePip();
      } finally {
        this.preservePipPlayback = false;
      }
      this.doc
        .querySelector<HTMLElement>('#movie_player')
        ?.focus({ preventScroll: true });
    };
    pip.addEventListener('resize', resized);
    pip.document.addEventListener('keydown', keyboard);
    pip.document.addEventListener('pointerdown', pointer);
    const restore = () => {
      if (!this.restorePip) return;
      this.restorePip = null;
      this.returnPip = null;
      returnArea.remove();
      releaseWindowControls();
      pip.clearTimeout(this.pipSizeTimer);
      saveSize();
      pip.removeEventListener('resize', resized);
      pip.removeEventListener('pagehide', restore);
      pip.document.removeEventListener('keydown', keyboard);
      pip.document.removeEventListener('pointerdown', pointer);
      this.root.append(this.bar, this.controls, ...this.resizeHandles);
      for (const node of [this.bar, this.controls, ...this.resizeHandles])
        node.hidden = true;
      this.bar.setAttribute(
        'aria-label',
        'Move mini player. Use arrow keys; Shift for fine adjustments.'
      );
      back?.setAttribute('aria-label', 'Back to top');
      if (back) back.title = 'Back to top';
      close?.setAttribute('aria-label', 'Close mini player');
      if (close) close.title = 'Close mini player';
      this.seekDrag = null;
      this.controls.dataset.seeking = 'false';
      this.seekHint.hidden = true;
      const playing = this.restorePipVideo(marker, originalStyle);
      this.pip = null;
      this.overridePip = false;
      this.finishPipPlayback(playing);
      video.dispatchEvent(new Event('timeupdate'));
      this.win.dispatchEvent(new Event('resize'));
    };
    this.restorePip = restore;
    pip.addEventListener('pagehide', restore, { once: true });
    layout();
    if (wasPlaying) void video.play().catch(() => {});
  }
  private restorePipVideo(marker: Comment, style: string | null): boolean {
    const video = this.video;
    // Capture the latest PiP time, including any seeks made while floating.
    // Adopting the node back into the page can reset the media clock.
    const time = video.currentTime;
    const playing = !video.paused;
    if (marker.parentNode) marker.replaceWith(video);
    if (style === null) video.removeAttribute('style');
    else video.setAttribute('style', style);
    delete video.dataset.mfsPip;
    if (Number.isFinite(time) && time >= 0 && video.currentTime !== time) {
      try {
        video.currentTime = time;
      } catch {
        if (!this.disposed)
          this.report(
            'Could not restore the video position after Picture-in-Picture.'
          );
      }
    }
    return playing;
  }
  private finishPipPlayback(playing: boolean): void {
    const automatic = this.automaticPip;
    this.automaticPip = this.automaticPipSawHidden = false;
    const preserve = this.preservePipPlayback;
    if (this.disposed) return;
    if (this.closingPipExplicitly || (!automatic && !preserve))
      this.video.pause();
    else {
      if (playing && this.video.isConnected)
        void this.video.play().catch(() => {});
      // A browser can close automatic PiP just before visibilitychange arrives.
      // Defer only that close decision so returning to the tab never pauses it.
      if (automatic && !preserve && this.doc.hidden)
        this.automaticPauseTimer = this.win.setTimeout(() => {
          if (this.doc.hidden && !this.inPip && !this.disposed)
            this.video.pause();
        }, 100);
    }
  }
  private closePip(pause = false): void {
    const pip = this.pip;
    this.preservePipPlayback = !pause;
    this.closingPipExplicitly = pause;
    try {
      this.restorePip?.();
      pip?.close();
    } finally {
      this.preservePipPlayback = false;
      this.closingPipExplicitly = false;
    }
  }
  reset(): void {
    this.generation++;
    this.suppressed = false;
    this.restoreMini(false);
    this.miniExitCleanup?.();
    this.closePip();
    this.restoreNativePip?.();
    if (this.doc.pictureInPictureElement === this.video) {
      this.preserveNativePipPlayback = true;
      void this.doc.exitPictureInPicture().catch(() => {
        this.preserveNativePipPlayback = false;
      });
    }
  }
  cleanup(): void {
    this.win.clearTimeout(this.automaticPauseTimer);
    this.disposed = true;
    delete this.video.dataset.mfsPipOverride;
    delete this.video.dataset.mfsPipAuto;
    delete this.video.dataset.mfsPipMode;
    this.doc.dispatchEvent(new Event(YOUTUBE_PIP_SETTINGS_CHANGED));
    this.reset();
    for (const clean of this.cleanupEvents) clean();
    this.bar.remove();
    for (const handle of this.resizeHandles) handle.remove();
    this.controls.remove();
  }
}
