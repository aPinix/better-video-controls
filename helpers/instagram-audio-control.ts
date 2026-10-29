// Use Instagram's own control so its React state, icon and video agree.
export function setupInstagramAudioControl(
  video: HTMLVideoElement,
  onControlsChange: () => void
) {
  const doc = video.ownerDocument;
  const realVideos = 'video:not(.mfs-thumbnail-video)';
  const playerRoot = () => {
    let root: HTMLElement = video;
    for (
      let parent = video.parentElement;
      parent && parent !== doc.body;
      parent = parent.parentElement
    ) {
      if (parent.querySelectorAll(realVideos).length > 1) break;
      root = parent;
    }
    return root;
  };
  let pending: { button: HTMLElement; from: boolean; to: boolean } | undefined;
  const findControl = () => {
    for (const icon of playerRoot().querySelectorAll<SVGElement>(
      'svg[aria-label]'
    )) {
      if (icon.closest('.mfs-media-controls, [data-mfs-action]')) continue;
      const label = icon.getAttribute('aria-label')?.trim() ?? '';
      const muted = /^(Audio is muted|Unmute|Turn on sound|Ativar som)$/i.test(
        label
      );
      if (
        !muted &&
        !/^(Audio is playing|Mute|Turn off sound|Desativar som)$/i.test(label)
      )
        continue;
      const button = icon.closest<HTMLElement>('button, [role="button"]');
      if (
        button &&
        !button.contains(video) &&
        !button.matches(':disabled, [aria-disabled="true"]')
      )
        return { button, muted };
    }
  };
  const observer = new MutationObserver(onControlsChange);
  observer.observe(playerRoot(), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });
  return {
    sync(muted: boolean) {
      const control = findControl();
      if (!control) return;
      if (control.muted === muted) {
        pending = undefined;
        return;
      }
      // React may commit the icon after volumechange. Don't toggle twice while
      // the same state change is still waiting to render.
      if (
        pending?.button === control.button &&
        pending.from === control.muted &&
        pending.to === muted
      )
        return;
      pending = { button: control.button, from: control.muted, to: muted };
      control.button.click();
    },
    cleanup: () => observer.disconnect(),
  };
}
