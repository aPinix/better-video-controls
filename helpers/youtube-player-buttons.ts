import {
  createYouTubeControlIcon,
  YOUTUBE_CONTROL_LABELS,
  YOUTUBE_CONTROL_SHORTCUTS,
  type YouTubeAdvancedControl,
  type YouTubeControl,
} from './youtube-control-icons';

export interface YouTubePlayerButtonState {
  loop: {
    enabled: boolean;
    available: boolean;
    expanded: boolean;
    active: boolean;
    hasSections: boolean;
  };
  boost: { level: number; active: boolean; available: boolean };
  cinema: { enabled: boolean; active: boolean; available: boolean };
  infoCards: { enabled: boolean; visible: boolean; available: boolean };
  screenshot: { enabled: boolean; available: boolean };
  filters: { enabled: boolean; available: boolean; expanded: boolean };
  pip: { enabled: boolean; available: boolean };
  bookmarks: { enabled: boolean; available: boolean; expanded: boolean };
}

const groupStyle =
  'position:relative;display:inline-flex;align-items:center;height:100%;vertical-align:top;flex-shrink:0;';
const buttonStyle =
  'position:relative;align-items:center;justify-content:center;width:48px;height:100%;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;';
const controlStyles = `
  .mfs-youtube-controls{background:transparent!important;box-shadow:none!important;border:0!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
  .mfs-youtube-controls::before,.mfs-youtube-controls::after{display:none!important}
  .mfs-youtube-actions{background:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
  .mfs-youtube-controls[data-stacked=true]{position:absolute!important;height:auto!important;flex-wrap:wrap;justify-content:flex-end;box-sizing:border-box;padding:4px;border-radius:20px;white-space:normal;z-index:1}
  .mfs-toolbar-background{position:absolute;left:0;right:0;top:50%;height:32px;transform:translateY(-50%);border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(16px);pointer-events:none}
  .mfs-youtube-controls[data-stacked=true] > .mfs-toolbar-background{top:0;bottom:0;height:auto!important;transform:none;border-radius:inherit}
  .mfs-youtube-controls[data-collapsed=true] .mfs-toolbar-background{display:none}
  .mfs-native-pill{position:absolute;pointer-events:none}
  .ytp-right-controls[data-mfs-morphing=true]{background:transparent!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
  .mfs-youtube-controls[data-stacked=true] > span,.mfs-youtube-controls[data-stacked=true] .mfs-player-button{height:32px!important;flex-shrink:0}
  .mfs-youtube-controls [data-action][hidden],.mfs-youtube-actions[hidden],.mfs-native-pill[hidden]{display:none!important}
  .mfs-youtube-controls[data-stacked=true] .mfs-youtube-actions{height:auto!important;flex:1!important;min-width:0;flex-wrap:wrap;justify-content:flex-end}
  .mfs-youtube-controls[data-stacked=true] .mfs-youtube-actions > span{height:32px!important}
  .mfs-player-button.ytp-button::after{display:none!important}
  .mfs-player-button.ytp-button{display:inline-flex}
  .mfs-player-button.ytp-button,.mfs-player-button.ytp-button:hover,.mfs-player-button.ytp-button:focus-visible{background:transparent!important;box-shadow:none!important;border-radius:0!important}
  .mfs-player-button.ytp-button.mfs-collapse-button{border-radius:50%!important}
  .mfs-collapse-button.ytp-button::before{content:"";display:block;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px!important;height:32px!important;box-sizing:border-box;border-radius:50%!important;pointer-events:none}
  .mfs-collapse-button.ytp-button:hover::before{background:rgba(255,255,255,.1)!important}
  .mfs-player-button[aria-pressed=true] .mfs-loop-frame{fill:#fff;stroke:#fff}
  .mfs-player-button[aria-pressed=true] .mfs-loop-arrows{stroke:#222}
  .mfs-player-button[aria-pressed=true] .mfs-toggle-fill{fill:currentColor}
  .mfs-player-button[aria-pressed=true] .mfs-toggle-detail{stroke:#222;fill:#222}
  .mfs-info-cards-button[aria-pressed=true] .mfs-toggle-fill{fill:none}
  .mfs-info-cards-button[aria-pressed=true] .mfs-toggle-detail{stroke:currentColor;fill:currentColor}
  .mfs-loop-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;position:relative;pointer-events:none}
  .html5-video-player:not(.ytp-delhi-modern) .mfs-player-button::before{content:"";display:block;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;height:32px;border-radius:40px;pointer-events:none}
  .html5-video-player:not(.ytp-delhi-modern) .mfs-player-button:hover::before{background:rgba(255,255,255,.1)}
  .mfs-player-button:focus-visible{outline:none}
  .mfs-player-button:focus-visible::before{outline:2px solid #fff;outline-offset:-1px;background:var(--yt-sys-color-baseline--overlay-button-secondary,rgba(255,255,255,.1))}
  .mfs-youtube-buttons[data-split=true]::before{content:"";position:absolute;left:0;right:0;top:50%;height:32px;transform:translateY(-50%);border-radius:999px;background:rgba(255,255,255,.1);pointer-events:none}
  .mfs-loop-tooltip{position:absolute;z-index:1003;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);display:flex;align-items:center;padding:5px 9px;border-radius:8px;backdrop-filter:var(--yt-frosted-glass-backdrop-filter-override,blur(16px));background:var(--yt-sys-color-baseline--overlay-background-medium-light,rgba(0,0,0,.3));color:#fff;font-size:118%;font-weight:500;line-height:15px;text-shadow:0 0 2px #000;white-space:nowrap;pointer-events:none;opacity:0;visibility:hidden;transition:opacity 100ms ease}
  .mfs-loop-tooltip .ytp-tooltip-keyboard-shortcut{display:flex;justify-content:center;align-items:center;border:1px solid rgba(255,255,255,.3);min-width:11px;border-radius:4px;margin-left:4px;color:#fff;padding:0 2px;font:inherit}
  .mfs-loop-tooltip[data-advanced=true],.mfs-loop-tooltip[data-multiline=true]{flex-direction:column;gap:4px;padding:7px 9px}
  .mfs-tooltip-heading{display:flex;align-items:center;max-width:100%}.mfs-tooltip-label{min-width:0;overflow-wrap:anywhere}
  .mfs-tooltip-hint{font-size:85%;font-weight:400;line-height:1.25;color:rgba(255,255,255,.65)}
  .mfs-loop-tooltip[hidden]{display:none!important}
  .mfs-player-button:hover + .mfs-loop-tooltip,.mfs-player-button:focus-visible + .mfs-loop-tooltip{opacity:1;visibility:visible}
  .mfs-player-button[aria-expanded=true]:not(.mfs-collapse-button) + .mfs-loop-tooltip{opacity:0;visibility:hidden}
  .mfs-screenshot-status{bottom:calc(100% + 24px);left:auto;right:0;transform:none;opacity:1;visibility:visible;max-width:260px;white-space:normal}
  .mfs-bookmark-status{width:max-content;font-size:12px}
  .mfs-filters-open,.mfs-advanced-open{cursor:auto!important}.mfs-filters-open .ytp-chrome-bottom,.mfs-advanced-open .ytp-chrome-bottom{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important}
`;

/** Owns all extension controls inserted into YouTube's native right toolbar. */
export class YouTubePlayerButtons {
  readonly toolbar: HTMLSpanElement;
  readonly container: HTMLSpanElement;
  readonly loopButton: HTMLButtonElement;
  readonly boostButton: HTMLButtonElement;
  readonly cinemaButton: HTMLButtonElement;
  readonly infoCardsButton: HTMLButtonElement;
  readonly screenshotButton: HTMLButtonElement;
  readonly filtersButton: HTMLButtonElement;
  readonly pipButton: HTMLButtonElement;
  readonly bookmarksButton: HTMLButtonElement;
  readonly collapseButton: HTMLButtonElement;
  private collapseContainer: HTMLSpanElement;
  private actionContainer: HTMLSpanElement;
  private collapsed = false;
  private collapseTimer: ReturnType<typeof setTimeout> | undefined;
  private collapseAnimation: Animation | undefined;
  private collapseAuxAnimations: Animation[] = [];
  private collapseTransition = false;
  private background: HTMLSpanElement;
  private nativePill: HTMLSpanElement;
  private morphingControls: HTMLElement | undefined;
  private boostContainer: HTMLSpanElement;
  private cinemaContainer: HTMLSpanElement;
  private infoCardsContainer: HTMLSpanElement;
  private screenshotContainer: HTMLSpanElement;
  private filtersContainer: HTMLSpanElement;
  private pipContainer: HTMLSpanElement;
  private bookmarksContainer: HTMLSpanElement;
  private bookmarkStatus: HTMLSpanElement;
  private bookmarkStatusTimer: ReturnType<typeof setTimeout> | undefined;
  private screenshotStatus: HTMLSpanElement;
  private statusTimer: ReturnType<typeof setTimeout> | undefined;
  private tips = new Map<HTMLButtonElement, HTMLSpanElement>();
  private disposed = false;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private cleanups: Array<() => void> = [];
  private resizeObserver: ResizeObserver | undefined;
  private controlsObserver: MutationObserver | undefined;
  private observedControls: HTMLElement | undefined;
  private layoutFrame: number | undefined;
  private layoutExtra = 0;

  constructor(
    private video: HTMLVideoElement,
    actions: {
      onLoop: () => void;
      onEdit: () => void;
      onBoost: () => void;
      onCinema: () => void;
      onInfoCards: () => void;
      onScreenshot: () => void;
      onFilters: () => void;
      onPip: () => void;
      onBookmarks: () => void;
      onEditBookmarks: () => void;
      onAdvanced?: (kind: YouTubeAdvancedControl) => void;
      onCollapse?: () => void;
    }
  ) {
    const doc = video.ownerDocument;
    this.toolbar = doc.createElement('span');
    this.toolbar.className = 'mfs-youtube-controls';
    this.toolbar.setAttribute('role', 'group');
    this.toolbar.setAttribute('aria-label', 'Better Video Controls');
    this.toolbar.style.cssText = groupStyle;
    const style = doc.createElement('style');
    style.textContent = controlStyles;
    this.toolbar.append(style);
    this.nativePill = doc.createElement('span');
    this.nativePill.className = 'mfs-native-pill';
    this.nativePill.setAttribute('aria-hidden', 'true');
    this.nativePill.hidden = true;
    this.toolbar.append(this.nativePill);
    this.background = doc.createElement('span');
    this.background.className = 'mfs-toolbar-background';
    this.background.setAttribute('aria-hidden', 'true');
    this.toolbar.append(this.background);
    this.actionContainer = this.group('mfs-youtube-actions');
    this.toolbar.append(this.actionContainer);
    this.boostContainer = this.group('mfs-youtube-boost');
    this.cinemaContainer = this.group('mfs-youtube-cinema');
    this.container = this.group('mfs-youtube-buttons');
    this.bookmarksContainer = this.group('mfs-youtube-bookmarks');
    this.infoCardsContainer = this.group('mfs-youtube-info-cards');
    this.screenshotContainer = this.group('mfs-youtube-screenshot');
    this.filtersContainer = this.group('mfs-youtube-filters');
    this.pipContainer = this.group('mfs-youtube-pip');
    this.boostButton = this.control(
      'boost',
      this.boostContainer,
      actions.onBoost
    );
    this.cinemaButton = this.control(
      'cinema',
      this.cinemaContainer,
      actions.onCinema
    );
    this.loopButton = this.control('loop', this.container, actions.onLoop);
    this.bookmarksButton = this.control(
      'bookmarks',
      this.bookmarksContainer,
      actions.onBookmarks
    );
    this.bookmarkStatus = doc.createElement('span');
    this.bookmarkStatus.className =
      'mfs-loop-tooltip mfs-screenshot-status mfs-bookmark-status';
    this.bookmarkStatus.setAttribute('role', 'status');
    this.bookmarkStatus.hidden = true;
    this.bookmarksContainer.append(this.bookmarkStatus);
    this.infoCardsButton = this.control(
      'infoCards',
      this.infoCardsContainer,
      actions.onInfoCards
    );
    this.screenshotButton = this.control(
      'screenshot',
      this.screenshotContainer,
      actions.onScreenshot
    );
    this.screenshotStatus = doc.createElement('span');
    this.screenshotStatus.className = 'mfs-loop-tooltip mfs-screenshot-status';
    this.screenshotStatus.setAttribute('role', 'status');
    this.screenshotStatus.hidden = true;
    this.screenshotContainer.append(this.screenshotStatus);
    this.filtersButton = this.control(
      'filters',
      this.filtersContainer,
      actions.onFilters
    );
    this.filtersButton.setAttribute('aria-haspopup', 'dialog');
    this.pipButton = this.control('pip', this.pipContainer, actions.onPip);
    this.collapseContainer = this.group('mfs-youtube-collapse');
    this.collapseButton = this.control(
      'collapse',
      this.collapseContainer,
      (event) => {
        this.setCollapsed(!this.collapsed, event.detail > 0);
        if (this.collapsed) actions.onCollapse?.();
      }
    );
    this.collapseButton.style.width = '40px';
    this.collapseButton.setAttribute('aria-expanded', 'true');
    this.toolbar.append(this.collapseContainer);
    for (const [kind, button] of [
      ['boost', this.boostButton],
      ['cinema', this.cinemaButton],
      ['loop', this.loopButton],
      ['screenshot', this.screenshotButton],
      ['bookmarks', this.bookmarksButton],
      ['pip', this.pipButton],
    ] as const) {
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      let held = false;
      let origin: { x: number; y: number } | null = null;
      const cancel = () => {
        clearTimeout(this.holdTimer);
        origin = null;
      };
      button.addEventListener('pointerdown', (event) => {
        cancel();
        held = false;
        if (event.button !== 0 || button.disabled || this.disposed) return;
        origin = { x: event.clientX, y: event.clientY };
        this.holdTimer = setTimeout(() => {
          if (!this.disposed && !button.disabled && button.isConnected) {
            held = true;
            if (kind === 'bookmarks') actions.onEditBookmarks();
            else if (kind === 'loop') actions.onEdit();
            else actions.onAdvanced?.(kind);
          }
        }, 600);
      });
      button.addEventListener('pointermove', (event) => {
        if (
          origin &&
          Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10
        )
          cancel();
      });
      button.addEventListener('pointerleave', cancel);
      // Opening an editor can reposition the toolbar underneath the pointer.
      // Consume the rest of that hold even if its release now targets the video.
      const finishHoldClick = (event: Event) => {
        if (!held) return;
        held = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      doc.addEventListener('click', finishHoldClick, true);
      this.cleanups.push(() =>
        doc.removeEventListener('click', finishHoldClick, true)
      );
      // Shift+Enter also makes advanced options reachable when tabbing through controls.
      button.addEventListener('keydown', (event) => {
        if (
          !this.disposed &&
          event.shiftKey &&
          event.key === 'Enter' &&
          !event.repeat &&
          !button.disabled
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (kind === 'bookmarks') actions.onEditBookmarks();
          else if (kind === 'loop') actions.onEdit();
          else actions.onAdvanced?.(kind);
        }
      });
      const finishHold = (event: Event) => {
        cancel();
        if (event.type === 'pointercancel') held = false;
        if (!held) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      for (const type of ['pointerup', 'pointercancel', 'mouseup']) {
        doc.addEventListener(type, finishHold, true);
        this.cleanups.push(() =>
          doc.removeEventListener(type, finishHold, true)
        );
      }
    }
    for (const type of ['pointerdown', 'mousedown', 'dblclick'])
      this.toolbar.addEventListener(type, (event) => event.stopPropagation());
  }

  private group(className: string) {
    const group = this.video.ownerDocument.createElement('span');
    group.className = className;
    group.style.cssText = groupStyle;
    if (!['mfs-youtube-collapse', 'mfs-youtube-actions'].includes(className))
      group.dataset.action = '';
    return group;
  }

  expand(): void {
    if (this.collapsed && !this.disposed) this.setCollapsed(false, false);
  }

  private setCollapsed(collapsed: boolean, motion: boolean): void {
    const win = this.video.ownerDocument.defaultView;
    const surface = this.actionContainer;
    const groups = [
      ...surface.querySelectorAll<HTMLElement>(':scope > [data-action]'),
    ];
    const interrupted = this.collapseTimer !== undefined;
    const duration = interrupted ? 220 : 400;
    const visible = !surface.hidden;
    // Capture presentation before cancelling so a second click reverses from
    // the currently painted frame, including the moving chevron.
    const before = surface.getBoundingClientRect();
    const anchor = this.collapseContainer.getBoundingClientRect();
    const toolbarRect = this.toolbar.getBoundingClientRect();
    const shellClip = win?.getComputedStyle(this.toolbar).clipPath;
    const scale = this.toolbar.offsetWidth
      ? toolbarRect.width / this.toolbar.offsetWidth || 1
      : 1;
    const presentations = groups.map((group) => {
      const style = win?.getComputedStyle(group);
      return {
        group,
        keyframe: {
          opacity: visible ? style?.opacity || '1' : '0',
          transform: visible ? style?.transform || 'none' : 'scale(0.9)',
        },
      };
    });
    const backgroundBefore = this.background.getBoundingClientRect();
    const backgroundStyle = win?.getComputedStyle(this.background);
    const backgroundClip = backgroundStyle?.clipPath;
    const backgroundOpacity = visible ? backgroundStyle?.opacity || '1' : '0';
    const controls = this.observedControls;
    const controlsBefore = controls?.getBoundingClientRect();
    const nativePillClip = this.nativePill.hidden
      ? undefined
      : win?.getComputedStyle(this.nativePill).clipPath;
    clearTimeout(this.collapseTimer);
    this.collapseTimer = undefined;
    this.collapseAnimation?.cancel();
    for (const animation of this.collapseAuxAnimations) animation.cancel();
    this.collapseAuxAnimations = [];
    this.collapseAnimation = undefined;
    this.collapseTransition = false;
    this.releaseNativePill();
    const animate =
      motion && !win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (collapsed && surface.contains(this.video.ownerDocument.activeElement))
      this.collapseButton.focus();
    const label = collapsed
      ? 'Expand custom actions'
      : 'Collapse custom actions';
    this.collapseButton.setAttribute('aria-expanded', String(!collapsed));
    this.collapseButton.setAttribute('aria-label', label);
    this.collapseButton
      .querySelector('path')
      ?.setAttribute('d', collapsed ? 'm14 5-5 5 5 5' : 'm9 5 5 5-5 5');
    this.tooltip(this.collapseButton, label);

    let destination = anchor;
    let controlsDestination: DOMRect | undefined;
    if (collapsed && animate && controls) {
      // Measure the docked position without painting that intermediate layout.
      const css = this.toolbar.style.cssText;
      const stacked = this.toolbar.dataset.stacked;
      this.collapsed = true;
      surface.hidden = true;
      this.mount(controls);
      this.layout();
      destination = this.collapseContainer.getBoundingClientRect();
      controlsDestination = controls.getBoundingClientRect();
      this.collapsed = false;
      surface.hidden = false;
      this.mount(controls);
      this.toolbar.style.cssText = css;
      this.toolbar.dataset.stacked = stacked;
    }
    this.collapsed = collapsed;
    this.collapseTransition = animate;
    this.toolbar.dataset.collapsed = 'false';
    surface.inert = collapsed;
    surface.hidden = false;
    for (const group of groups) {
      group.inert = collapsed;
      group.hidden = false;
    }
    if (!collapsed) {
      if (this.observedControls) this.mount(this.observedControls);
      this.collapseTransition = false;
      this.layoutExtra = 0;
      this.layout();
      this.collapseTransition = animate;
    }
    const target = surface.getBoundingClientRect();
    const chevron = this.collapseContainer.getBoundingClientRect();
    const animateShell = this.toolbar.dataset.stacked === 'true';
    const finish = () => {
      this.collapseTimer = undefined;
      if (this.disposed || this.collapsed !== collapsed) return;
      surface.hidden = collapsed;
      for (const group of surface.querySelectorAll<HTMLElement>(
        ':scope > [data-action]'
      ))
        group.hidden = collapsed;
      this.collapseTransition = false;
      this.toolbar.dataset.collapsed = String(collapsed);
      if (this.observedControls) this.mount(this.observedControls);
      this.layoutExtra = 0;
      this.layout();
      this.collapseAnimation?.cancel();
      this.collapseAnimation = undefined;
      for (const animation of this.collapseAuxAnimations) animation.cancel();
      this.collapseAuxAnimations = [];
      this.releaseNativePill();
    };
    if (!animate) {
      finish();
      return;
    }
    const options: KeyframeAnimationOptions = {
      duration,
      easing: 'cubic-bezier(.32,.72,0,1)',
      fill: 'both',
    };
    const fromX = visible
      ? (before.left - target.left) / scale
      : (anchor.left - target.right) / scale;
    const fromY = visible
      ? (before.top - target.top) / scale
      : (anchor.top + anchor.height / 2 - target.top - target.height / 2) /
        scale;
    const toX = collapsed ? (destination.left - target.right) / scale : 0;
    const toY = collapsed
      ? (destination.top +
          destination.height / 2 -
          target.top -
          target.height / 2) /
        scale
      : 0;
    this.collapseAnimation = surface.animate?.(
      [
        {
          transform: animateShell
            ? 'translate(0px,0px)'
            : `translate(${fromX}px,${fromY}px)`,
        },
        {
          transform: animateShell
            ? 'translate(0px,0px)'
            : `translate(${toX}px,${toY}px)`,
        },
      ],
      options
    );
    // Native and upper-row buttons can have different heights. Match their
    // centers so the icon does not jump a few pixels when it docks.
    const chevronTranslation = (rect: DOMRect) =>
      `translate(${(rect.left + rect.width / 2 - chevron.left - chevron.width / 2) / scale}px,${(rect.top + rect.height / 2 - chevron.top - chevron.height / 2) / scale}px)`;
    const chevronAnimation = this.collapseContainer.animate?.(
      [
        {
          transform: animateShell
            ? 'translate(0px,0px)'
            : chevronTranslation(anchor),
        },
        {
          transform:
            collapsed && !animateShell
              ? chevronTranslation(destination)
              : 'translate(0px,0px)',
        },
      ],
      options
    );
    const backgroundBounds = this.background.getBoundingClientRect();
    const baseTransform =
      win?.getComputedStyle(this.background).transform || 'none';
    const translateBackground = (x: number, y: number) =>
      `${baseTransform === 'none' ? '' : baseTransform} translate(${x}px,${y}px)`;
    const centerX =
      (chevron.left + chevron.width / 2 - backgroundBounds.left) / scale;
    const centerY =
      (chevron.top + chevron.height / 2 - backgroundBounds.top) / scale;
    const closedClip = `inset(${centerY - 16}px ${backgroundBounds.width / scale - centerX - 16}px ${backgroundBounds.height / scale - centerY - 16}px ${centerX - 16}px round 16px)`;
    const openClip = 'inset(0px 0px 0px 0px round 16px)';
    const chevronToX =
      (destination.left +
        destination.width / 2 -
        chevron.left -
        chevron.width / 2) /
      scale;
    const chevronToY =
      (destination.top +
        destination.height / 2 -
        chevron.top -
        chevron.height / 2) /
      scale;
    const backgroundAnimation = this.background.animate?.(
      [
        {
          transform: translateBackground(
            animateShell
              ? 0
              : visible
                ? (backgroundBefore.left - backgroundBounds.left) / scale
                : (anchor.left - chevron.left) / scale,
            animateShell
              ? 0
              : visible
                ? (backgroundBefore.top - backgroundBounds.top) / scale
                : (anchor.top +
                    anchor.height / 2 -
                    chevron.top -
                    chevron.height / 2) /
                  scale
          ),
          opacity: backgroundOpacity,
        },
        { offset: collapsed ? 0.85 : 0.15, opacity: 1 },
        {
          transform: translateBackground(
            collapsed && !animateShell ? chevronToX : 0,
            collapsed && !animateShell ? chevronToY : 0
          ),
          opacity: collapsed ? 0 : 1,
        },
      ],
      options
    );
    // Retraction follows the stagger rather than outrunning the disappearing
    // buttons; the pill's position still follows the same easing as the chevron.
    const backgroundShapeAnimation = !animateShell
      ? this.background.animate?.(
          [
            {
              clipPath:
                visible && backgroundClip && backgroundClip !== 'none'
                  ? backgroundClip
                  : visible
                    ? openClip
                    : closedClip,
            },
            { clipPath: collapsed ? closedClip : openClip },
          ],
          { ...options, easing: collapsed ? 'linear' : options.easing }
        )
      : undefined;
    // In the upper layout the wrapper itself owns the silhouette. Masking only
    // its background leaves native container styling at its full static size.
    const shellBounds = this.toolbar.getBoundingClientRect();
    const shellCenterX =
      (chevron.left + chevron.width / 2 - shellBounds.left) / scale;
    const shellCenterY =
      (chevron.top + chevron.height / 2 - shellBounds.top) / scale;
    const shellClosed = `inset(${shellCenterY - 16}px ${shellBounds.width / scale - shellCenterX - 16}px ${shellBounds.height / scale - shellCenterY - 16}px ${shellCenterX - 16}px round 16px)`;
    const shellOpen = 'inset(0px 0px 0px 0px round 20px)';
    const shellMotion = animateShell
      ? this.toolbar.animate?.(
          [
            { transform: chevronTranslation(anchor) },
            {
              transform: collapsed
                ? chevronTranslation(destination)
                : 'translate(0px,0px)',
            },
          ],
          options
        )
      : undefined;
    const shellShape = animateShell
      ? this.toolbar.animate?.(
          [
            {
              clipPath:
                visible && shellClip && shellClip !== 'none'
                  ? shellClip
                  : visible
                    ? shellOpen
                    : shellClosed,
            },
            { clipPath: collapsed ? shellClosed : shellOpen },
          ],
          { ...options, easing: collapsed ? 'linear' : options.easing }
        )
      : undefined;
    const buttonAnimations = presentations.map(({ group, keyframe }, index) => {
      const rank = collapsed ? index : groups.length - 1 - index;
      return group.animate?.(
        [
          keyframe,
          {
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? 'scale(0.9)' : 'scale(1)',
          },
        ],
        {
          duration: collapsed ? 140 : 160,
          delay: interrupted ? 0 : (collapsed ? 0 : 30) + rank * 30,
          easing: 'cubic-bezier(.23,1,.32,1)',
          fill: 'both',
        }
      );
    });
    // On the same row, YouTube's own right-controls pill wraps the toolbar and
    // would snap to its final width. Paint a stand-in for it and morph that
    // between the docked and expanded silhouettes alongside our background.
    let nativePillAnimation: Animation | undefined;
    const controlsStyle =
      !animateShell && controls?.contains(this.toolbar)
        ? win?.getComputedStyle(controls)
        : undefined;
    if (
      controls &&
      controlsStyle &&
      (!['', 'transparent', 'rgba(0, 0, 0, 0)'].includes(
        controlsStyle.backgroundColor
      ) ||
        !['', 'none'].includes(controlsStyle.backgroundImage) ||
        !['', 'none'].includes(controlsStyle.backdropFilter))
    ) {
      const live = controls.getBoundingClientRect();
      const box = this.toolbar.getBoundingClientRect();
      const radius = Number.parseFloat(controlsStyle.borderRadius) || 0;
      const silhouette = (rect: DOMRect) =>
        `inset(${(rect.top - live.top) / scale}px ${(live.right - rect.right) / scale}px ${(live.bottom - rect.bottom) / scale}px ${(rect.left - live.left) / scale}px round ${radius}px)`;
      for (const property of [
        'background-color',
        'background-image',
        'backdrop-filter',
        'border-radius',
      ])
        this.nativePill.style.setProperty(
          property,
          controlsStyle.getPropertyValue(property)
        );
      this.nativePill.style.left = `${(live.left - box.left) / scale}px`;
      this.nativePill.style.top = `${(live.top - box.top) / scale}px`;
      this.nativePill.style.width = `${live.width / scale}px`;
      this.nativePill.style.height = `${live.height / scale}px`;
      this.nativePill.hidden = false;
      controls.dataset.mfsMorphing = 'true';
      this.morphingControls = controls;
      nativePillAnimation = this.nativePill.animate?.(
        [
          {
            clipPath:
              nativePillClip && nativePillClip !== 'none'
                ? nativePillClip
                : silhouette(controlsBefore ?? live),
          },
          {
            clipPath: silhouette(
              collapsed ? (controlsDestination ?? live) : live
            ),
          },
        ],
        { ...options, easing: collapsed ? 'linear' : options.easing }
      );
    }
    this.collapseAuxAnimations = [
      chevronAnimation,
      backgroundAnimation,
      backgroundShapeAnimation,
      shellMotion,
      shellShape,
      nativePillAnimation,
      ...buttonAnimations,
    ].filter((animation): animation is Animation => !!animation);
    this.collapseTimer = setTimeout(finish, duration);
  }

  private releaseNativePill(): void {
    this.nativePill.hidden = true;
    if (this.morphingControls) delete this.morphingControls.dataset.mfsMorphing;
    this.morphingControls = undefined;
  }

  private control(
    kind: YouTubeControl | 'edit' | 'collapse',
    group: HTMLSpanElement,
    action: (event: MouseEvent) => void
  ) {
    const doc = this.video.ownerDocument;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = `ytp-button mfs-player-button mfs-${kind === 'infoCards' ? 'info-cards' : kind}-button`;
    button.setAttribute(
      'aria-label',
      kind === 'edit'
        ? 'Edit loop sections'
        : kind === 'collapse'
          ? 'Collapse custom actions'
          : YOUTUBE_CONTROL_LABELS[kind]
    );
    button.style.cssText = buttonStyle;
    if (kind !== 'edit' && kind !== 'collapse') {
      const key = YOUTUBE_CONTROL_SHORTCUTS[kind].toUpperCase();
      const advanced = [
        'boost',
        'cinema',
        'loop',
        'screenshot',
        'bookmarks',
        'pip',
      ].includes(kind);
      button.setAttribute(
        'aria-keyshortcuts',
        advanced ? `${key} Shift+${key} Shift+Enter` : key
      );
      button.dataset.shortcut = YOUTUBE_CONTROL_SHORTCUTS[kind];
      if (advanced) button.dataset.advanced = 'true';
      if (kind === 'bookmarks')
        button.dataset.advancedHint = 'Hold to edit bookmarks';
      if (kind === 'loop')
        button.dataset.advancedHint = 'Hold to edit loop sections';
      if (advanced)
        button.setAttribute(
          'aria-description',
          `Hold for options, or press Shift+${key}.`
        );
    }
    const icon = doc.createElement('span');
    icon.className = 'mfs-loop-icon';
    icon.append(createYouTubeControlIcon(doc, kind));
    button.append(icon);
    const tip = doc.createElement('span');
    tip.className = 'mfs-loop-tooltip';
    tip.setAttribute('role', 'tooltip');
    this.tips.set(button, tip);
    this.tooltip(button, button.getAttribute('aria-label') ?? '');
    group.append(button, tip);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.disposed && !button.disabled) action(event);
    });
    const syncTooltip = () => {
      const player = this.video.closest('#movie_player, .html5-video-player');
      const win = doc.defaultView;
      const nativeWrapper = player?.querySelector<HTMLElement>(
        '.ytp-tooltip-text-wrapper'
      );
      const nativeText =
        player?.querySelector<HTMLElement>('.ytp-tooltip-text');
      if (win && nativeWrapper && nativeText) {
        const wrapperStyle = win.getComputedStyle(nativeWrapper);
        const textStyle = win.getComputedStyle(nativeText);
        tip.style.boxShadow = wrapperStyle.boxShadow;
        for (const property of [
          'font-family',
          'font-size',
          'font-weight',
          'line-height',
          'color',
          'text-shadow',
        ])
          tip.style.setProperty(property, textStyle.getPropertyValue(property));
      }
      // Use the button's local layout coordinates; native tooltip positions can
      // be stale, and viewport coordinates would apply player scaling twice.
      tip.style.left = `${button.offsetLeft + button.offsetWidth / 2}px`;
      tip.style.bottom = `calc(100% + ${12 - button.offsetTop}px)`;
      const bounds = player?.getBoundingClientRect();
      if (bounds?.width) {
        const buttonRect = button.getBoundingClientRect();
        const scale =
          button.offsetWidth && buttonRect.width
            ? buttonRect.width / button.offsetWidth
            : 1;
        const padding = Math.min(8, bounds.width / 4);
        tip.style.maxWidth = `${(bounds.width - padding * 2) / scale}px`;
        tip.style.boxSizing = 'border-box';
        tip.style.whiteSpace = 'normal';
        tip.style.width = 'max-content';
        const rect = tip.getBoundingClientRect();
        const shift =
          rect.right > bounds.right - padding
            ? bounds.right - padding - rect.right
            : rect.left < bounds.left + padding
              ? bounds.left + padding - rect.left
              : 0;
        if (rect.width && shift)
          tip.style.left = `${button.offsetLeft + button.offsetWidth / 2 + shift / scale}px`;
      }
    };
    button.addEventListener('pointerenter', syncTooltip);
    button.addEventListener('focus', syncTooltip);
    return button;
  }

  private state(
    button: HTMLButtonElement,
    active: boolean,
    available: boolean,
    tooltip: string,
    actionHint?: string
  ) {
    button.disabled = !available;
    button.setAttribute('aria-pressed', String(active));
    button.style.opacity = !available ? '.3' : '1';
    button.style.transition = 'opacity 180ms ease';
    const tip = this.tips.get(button);
    if (tip) this.tooltip(button, tooltip, actionHint);
  }

  private watchLayout(controls: HTMLElement): void {
    if (this.observedControls === controls) return;
    this.resizeObserver?.disconnect();
    this.controlsObserver?.disconnect();
    this.observedControls = controls;
    this.layoutExtra = 0;
    const win = this.video.ownerDocument.defaultView;
    if (!win) return;
    const observeControls = () => {
      const chrome = controls.closest<HTMLElement>('.ytp-chrome-bottom');
      const candidates = [
        controls,
        chrome,
        ...(chrome?.querySelectorAll('*') ?? []),
      ];
      for (const element of candidates)
        if (
          element instanceof win.HTMLElement &&
          !this.toolbar.contains(element)
        )
          this.resizeObserver?.observe(element);
    };
    if (win?.ResizeObserver) {
      this.resizeObserver = new win.ResizeObserver(() => this.layout());
      observeControls();
    }
    if (win?.MutationObserver) {
      this.controlsObserver = new win.MutationObserver((records) => {
        if (records.some(({ target }) => !this.toolbar.contains(target))) {
          if (records.some(({ type }) => type === 'childList'))
            observeControls();
          this.layout();
        }
      });
      const chrome = controls.closest('.ytp-chrome-bottom') ?? controls;
      this.controlsObserver.observe(chrome, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
      });
    }
  }

  private layout(): void {
    if (this.collapseTransition) return;
    const controls = this.observedControls;
    if (this.disposed || !controls || !controls.contains(this.toolbar)) return;
    if (this.collapsed) {
      this.toolbar.dataset.stacked = 'false';
      for (const property of ['bottom', 'right', 'max-width', 'width'])
        this.toolbar.style.removeProperty(property);
      return;
    }
    const chrome = controls.closest<HTMLElement>('.ytp-chrome-bottom');
    if (!chrome || chrome.clientWidth <= 0) return;
    const win = this.video.ownerDocument.defaultView;
    if (!win) return;
    const chromeRect = chrome.getBoundingClientRect();
    const scale = chromeRect.width / chrome.clientWidth || 1;
    const horizontalSpacing = (style: CSSStyleDeclaration): number =>
      (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0);
    const children = (element: HTMLElement): HTMLElement[] =>
      [...element.children].filter(
        (child): child is HTMLElement => child instanceof win.HTMLElement
      );
    const collapsed = (element: HTMLElement): boolean => {
      const style = win.getComputedStyle(element);
      return (
        style.width === '0px' &&
        ['hidden', 'clip'].some(
          (value) => style.overflowX === value || style.overflow === value
        )
      );
    };
    const width = (element: HTMLElement): number => {
      const style = win.getComputedStyle(element);
      if (element.hidden || style.display === 'none' || collapsed(element))
        return 0;
      const renderedWidth = element.getBoundingClientRect().width / scale;
      return (
        (renderedWidth ||
          element.offsetWidth ||
          Number.parseFloat(style.width) ||
          0) +
        (Number.parseFloat(style.marginLeft) || 0) +
        (Number.parseFloat(style.marginRight) || 0)
      );
    };
    const contentWidth = (element: HTMLElement): number => {
      const style = win.getComputedStyle(element);
      if (element.hidden || style.display === 'none' || collapsed(element))
        return 0;
      const visible = children(element).filter(
        (child) =>
          !child.hidden && win.getComputedStyle(child).display !== 'none'
      );
      if (!visible.length) return width(element);
      const inline =
        style.display.includes('flex') || style.whiteSpace === 'nowrap';
      const rendered = visible.map((child) => child.getBoundingClientRect());
      const extent = rendered.some((rect) => rect.width > 0)
        ? (Math.max(
            ...rendered
              .filter((rect) => rect.width > 0)
              .map((rect) => rect.right)
          ) -
            Math.min(
              ...rendered
                .filter((rect) => rect.width > 0)
                .map((rect) => rect.left)
            )) /
          scale
        : 0;
      return (
        Math.max(
          extent,
          inline
            ? visible.reduce((total, child) => total + contentWidth(child), 0) +
                (Number.parseFloat(style.columnGap) || 0) * (visible.length - 1)
            : 0
        ) +
        horizontalSpacing(style) +
        (Number.parseFloat(style.marginLeft) || 0) +
        (Number.parseFloat(style.marginRight) || 0)
      );
    };
    const left = chrome.querySelector<HTMLElement>('.ytp-left-controls');
    const native = [...controls.children].filter(
      (element): element is HTMLElement =>
        element instanceof win.HTMLElement && element !== this.toolbar
    );
    const nativeWidth = native.reduce(
      (total, element) =>
        total + Math.max(width(element), contentWidth(element)),
      0
    );
    const customWidth = [...this.tips.keys()]
      .filter(
        (button) =>
          this.toolbar.contains(button) && !button.parentElement?.hidden
      )
      .reduce((total, button) => total + width(button), 0);
    const controlsStyle = win.getComputedStyle(controls);
    const chromeStyle = win.getComputedStyle(chrome);
    const row = controls.closest<HTMLElement>('.ytp-chrome-controls');
    const rowStyle = row && win.getComputedStyle(row);
    const rowWidth = row
      ? row.clientWidth ||
        row.getBoundingClientRect().width / scale ||
        chrome.clientWidth
      : chrome.clientWidth;
    const availableWidth = Math.min(
      chrome.clientWidth - horizontalSpacing(chromeStyle),
      rowWidth - (rowStyle ? horizontalSpacing(rowStyle) : 0)
    );
    const gap = Number.parseFloat(controlsStyle.columnGap) || 0;
    const leftStyle = left && win.getComputedStyle(left);
    // Modern YouTube stretches/shrinks the left container to fill the remaining
    // space. Measure its controls, not that allocated width. Chapter titles are
    // intentionally allowed to truncate before moving our buttons to a new row.
    const leftChildren =
      left &&
      children(left).filter(
        (child) =>
          !child.classList.contains('ytp-chapter-container') &&
          !child.hidden &&
          win.getComputedStyle(child).display !== 'none'
      );
    const leftWidth =
      left && leftStyle && leftChildren?.length
        ? leftChildren.reduce(
            (total, child) =>
              total + Math.max(width(child), contentWidth(child)),
            0
          ) +
          horizontalSpacing(leftStyle) +
          (Number.parseFloat(leftStyle.columnGap) || 0) *
            (leftChildren.length - 1) +
          (Number.parseFloat(leftStyle.marginLeft) || 0) +
          (Number.parseFloat(leftStyle.marginRight) || 0)
        : left
          ? width(left)
          : 0;
    const protectedRects =
      leftChildren
        ?.filter((child) => !collapsed(child))
        .flatMap((child) => [child, ...children(child)])
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width > 0) ?? [];
    const protectedWidth = protectedRects.length
      ? (Math.max(...protectedRects.map((rect) => rect.right)) -
          Math.min(...protectedRects.map((rect) => rect.left))) /
          scale +
        (leftStyle ? horizontalSpacing(leftStyle) : 0)
      : 0;
    const requiredWidth =
      customWidth +
      nativeWidth +
      Math.max(leftWidth, protectedWidth) +
      gap * native.length +
      horizontalSpacing(controlsStyle) +
      (left && rowStyle ? Number.parseFloat(rowStyle.columnGap) || 0 : 0);
    const wasStacked = this.toolbar.dataset.stacked === 'true';
    const toolbarRect = this.toolbar.getBoundingClientRect();
    const nativeRects = native
      .flatMap((element) => [
        ...(element.matches('button,.ytp-button,[role=button]')
          ? [element]
          : []),
        ...element.querySelectorAll('button,.ytp-button,[role=button],svg'),
      ])
      .map((element) => element.getBoundingClientRect())
      .filter(
        (rect) =>
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > toolbarRect.top &&
          rect.top < toolbarRect.bottom
      );
    const rightOverlap = nativeRects.length
      ? (toolbarRect.right -
          Math.min(...nativeRects.map((rect) => rect.left))) /
        scale
      : 0;
    // Padding, nested button groups, and animated native controls can overflow
    // their allocated containers. Also check their actual painted positions.
    const deficit =
      !wasStacked && toolbarRect.width > 0
        ? Math.max(
            0,
            rightOverlap > 0.5 ? rightOverlap + 8 : 0,
            ...protectedRects
              .filter(
                (rect) =>
                  rect.bottom > toolbarRect.top && rect.top < toolbarRect.bottom
              )
              .map(
                (rect) => (rect.right + 8 * scale - toolbarRect.left) / scale
              )
          )
        : 0;
    if (!wasStacked)
      this.layoutExtra =
        deficit > 0
          ? Math.max(0, availableWidth + deficit - requiredWidth - 8)
          : 0;
    // Leave a small gap before contact, and require a little more room to move
    // back inline so native flex resizing cannot make the toolbar oscillate.
    const stacked =
      requiredWidth + this.layoutExtra + (wasStacked ? 16 : 8) > availableWidth;
    this.toolbar.dataset.stacked = String(stacked);
    if (!stacked) {
      this.toolbar.style.removeProperty('bottom');
      this.toolbar.style.removeProperty('right');
      this.toolbar.style.removeProperty('max-width');
      this.toolbar.style.removeProperty('width');
      if (wasStacked && this.layoutFrame === undefined)
        this.layoutFrame = win.requestAnimationFrame(() => {
          this.layoutFrame = undefined;
          this.layout();
        });
      return;
    }
    // Position above the whole native chrome, including the progress bar.
    // Convert viewport coordinates back to player-local units for scaled players.
    const parent = (this.toolbar.offsetParent as HTMLElement | null) ?? chrome;
    const parentRect = parent.getBoundingClientRect();
    this.toolbar.style.bottom = `${Math.max(0, (parentRect.bottom - chromeRect.top) / scale) + 8}px`;
    this.toolbar.style.right = `${Math.max(0, (parentRect.right - chromeRect.right) / scale)}px`;
    this.toolbar.style.maxWidth = `${chrome.clientWidth}px`;
    this.toolbar.style.width = `${Math.min(customWidth + 8, chrome.clientWidth)}px`;
  }

  private tooltip(
    button: HTMLButtonElement,
    label: string,
    actionHint?: string
  ): void {
    const tip = this.tips.get(button);
    if (!tip) return;
    let text = tip.querySelector('.mfs-tooltip-label');
    if (!text) {
      const heading = this.video.ownerDocument.createElement('span');
      heading.className = 'mfs-tooltip-heading';
      text = this.video.ownerDocument.createElement('span');
      text.className = 'mfs-tooltip-label';
      heading.append(text);
      tip.append(heading);
      if (button.dataset.shortcut) {
        const key = this.video.ownerDocument.createElement('span');
        key.className = 'ytp-tooltip-keyboard-shortcut';
        key.textContent = button.dataset.shortcut.toUpperCase();
        heading.append(key);
      }
      if (button.dataset.advanced === 'true') {
        tip.dataset.advanced = 'true';
      }
    }
    text.textContent = label;
    const hintText =
      button.dataset.advanced === 'true'
        ? (button.dataset.advancedHint ?? 'Hold for options')
        : actionHint;
    let hint = tip.querySelector<HTMLElement>('.mfs-tooltip-hint');
    if (hintText && !hint) {
      hint = this.video.ownerDocument.createElement('span');
      hint.className = 'mfs-tooltip-hint';
      tip.append(hint);
    }
    if (hint) {
      hint.textContent = hintText ?? '';
      hint.hidden = !hintText;
    }
    tip.dataset.multiline = String(!!hintText);
  }

  private mount(controls: HTMLElement): void {
    // Modern YouTube gives captions/settings their own pill. Tuck the remaining
    // chevron into that pill instead of leaving an empty custom row above it.
    const parent =
      (this.collapsed && !this.collapseTransition
        ? controls.querySelector<HTMLElement>('.ytp-right-controls-left')
        : null) ?? controls;
    let anchor = parent.querySelector(
      '.ytp-autonav-toggle, .ytp-autonav-toggle-button, .ytp-subtitles-button, .ytp-settings-button'
    );
    while (anchor && anchor.parentElement !== parent)
      anchor = anchor.parentElement;
    anchor ??=
      [...parent.children].find((node) => node !== this.toolbar) ?? null;
    if (
      this.toolbar.parentElement !== parent ||
      this.toolbar.nextElementSibling !== anchor
    ) {
      const focused = this.video.ownerDocument
        .activeElement as HTMLElement | null;
      const restoreFocus = focused && this.toolbar.contains(focused);
      parent.insertBefore(this.toolbar, anchor);
      if (restoreFocus) focused.focus({ preventScroll: true });
    }
  }

  update({
    loop,
    boost,
    cinema,
    infoCards,
    screenshot,
    filters,
    pip,
    bookmarks,
  }: YouTubePlayerButtonState): void {
    if (this.disposed) return;
    const player = this.video.closest('#movie_player, .html5-video-player');
    const mainVideo =
      player?.querySelector('video.html5-main-video') ??
      player?.querySelector('video');
    const controls = player?.querySelector<HTMLElement>('.ytp-right-controls');
    const groups = [
      [this.boostContainer, boost.level > 0],
      [this.cinemaContainer, cinema.enabled],
      [this.container, loop.enabled],
      [this.bookmarksContainer, bookmarks.enabled],
      [this.infoCardsContainer, infoCards.enabled],
      [this.screenshotContainer, screenshot.enabled],
      [this.filtersContainer, filters.enabled],
      [this.pipContainer, pip.enabled],
    ] as const;
    if (
      !controls ||
      mainVideo !== this.video ||
      !groups.some(([, enabled]) => enabled)
    ) {
      this.toolbar.remove();
      this.resizeObserver?.disconnect();
      this.controlsObserver?.disconnect();
      this.observedControls = undefined;
      return;
    }
    // Move only when order changes so focus and native hover state survive updates.
    let previous: Element | null = null;
    for (const [group, enabled] of groups) {
      if (!enabled) {
        group.remove();
        continue;
      }
      if (
        previous
          ? previous.nextElementSibling !== group
          : this.actionContainer.firstElementChild !== group
      ) {
        if (previous) previous.after(group);
        else this.actionContainer.prepend(group);
      }
      group.inert = this.collapsed;
      group.hidden = this.actionContainer.hidden;
      previous = group;
    }
    this.mount(controls);
    const native = controls.querySelector<HTMLButtonElement>(
      '.ytp-settings-button, .ytp-subtitles-button'
    );
    if (native) {
      const nativeStyle =
        this.video.ownerDocument.defaultView?.getComputedStyle(native);
      if (nativeStyle && Number.parseFloat(nativeStyle.width) > 0) {
        for (const button of this.tips.keys()) {
          if (button !== this.collapseButton)
            button.style.width = nativeStyle.width;
          button.style.height = nativeStyle.height;
        }
      }
    }
    this.state(
      this.boostButton,
      boost.active,
      boost.available,
      boost.available
        ? `Boost Volume · ${boost.level}×`
        : 'Boost Volume unavailable for this video'
    );
    this.state(
      this.cinemaButton,
      cinema.active,
      cinema.available,
      cinema.available
        ? `${cinema.active ? 'Turn off' : 'Turn on'} Cinema Mode`
        : 'Cinema Mode unavailable for this video'
    );
    this.state(
      this.infoCardsButton,
      infoCards.visible,
      infoCards.available,
      infoCards.available
        ? `End-screen cards: ${infoCards.visible ? 'visible' : 'hidden'}`
        : 'End-screen cards unavailable during ads',
      infoCards.available
        ? `Click to ${infoCards.visible ? 'hide' : 'show'} recommendations`
        : undefined
    );
    this.infoCardsButton.setAttribute(
      'aria-description',
      infoCards.available
        ? `Recommendations are ${infoCards.visible ? 'visible' : 'hidden'}. Activate to ${infoCards.visible ? 'hide' : 'show'} them.`
        : 'Unavailable during ads.'
    );
    this.state(
      this.loopButton,
      loop.active,
      loop.available,
      loop.available
        ? 'Loop Sections'
        : 'Loop Sections unavailable during ads or live streams'
    );
    this.screenshotButton.disabled = !screenshot.available;
    this.screenshotButton.style.opacity = screenshot.available ? '1' : '.3';
    this.filtersButton.disabled = !filters.available;
    this.filtersButton.setAttribute('aria-expanded', String(filters.expanded));
    this.filtersButton.style.opacity = filters.available ? '1' : '.3';
    this.pipButton.disabled = !pip.available;
    this.bookmarksButton.disabled = !bookmarks.available;
    this.bookmarksButton.style.opacity = bookmarks.available ? '1' : '.3';
    this.bookmarksButton.setAttribute(
      'aria-expanded',
      String(bookmarks.expanded)
    );
    if (bookmarks.expanded) this.bookmarkStatus.hidden = true;
    this.tooltip(
      this.bookmarksButton,
      bookmarks.available
        ? 'Bookmark this moment'
        : 'Bookmarks unavailable during ads or live streams'
    );
    this.pipButton.style.opacity = pip.available ? '1' : '.3';
    this.tooltip(
      this.pipButton,
      pip.available
        ? 'Open Picture-in-Picture'
        : 'Picture-in-Picture unavailable for this video'
    );
    const screenshotTip = this.tips.get(this.screenshotButton);
    if (screenshotTip)
      this.tooltip(
        this.screenshotButton,
        screenshot.available
          ? 'Save video frame as PNG'
          : 'Screenshot unavailable for this video'
      );
    const filtersTip = this.tips.get(this.filtersButton);
    if (filtersTip) this.tooltip(this.filtersButton, 'Video Filters');
    this.loopButton.style.opacity = loop.available ? '1' : '.4';
    this.loopButton.setAttribute('aria-expanded', String(loop.expanded));
    this.watchLayout(controls);
    this.layout();
  }

  reportScreenshot(message: string): void {
    if (this.disposed) return;
    clearTimeout(this.statusTimer);
    this.screenshotStatus.textContent = message;
    this.screenshotStatus.hidden = false;
    this.statusTimer = setTimeout(() => {
      this.screenshotStatus.hidden = true;
    }, 5000);
  }

  reportBookmark(message: string): void {
    if (this.disposed) return;
    clearTimeout(this.bookmarkStatusTimer);
    this.bookmarkStatus.textContent = message;
    this.bookmarkStatus.hidden = false;
    this.bookmarkStatusTimer = setTimeout(() => {
      this.bookmarkStatus.hidden = true;
    }, 3000);
  }

  cleanup(): void {
    this.disposed = true;
    clearTimeout(this.statusTimer);
    clearTimeout(this.bookmarkStatusTimer);
    clearTimeout(this.holdTimer);
    clearTimeout(this.collapseTimer);
    this.collapseAnimation?.cancel();
    for (const animation of this.collapseAuxAnimations) animation.cancel();
    this.releaseNativePill();
    for (const cleanup of this.cleanups) cleanup();
    this.resizeObserver?.disconnect();
    this.controlsObserver?.disconnect();
    if (this.layoutFrame !== undefined)
      this.video.ownerDocument.defaultView?.cancelAnimationFrame(
        this.layoutFrame
      );
    this.toolbar.remove();
  }
}
