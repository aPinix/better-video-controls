const triggers = new Map<HTMLButtonElement, (open: boolean) => void>();
let pointer: { x: number; y: number } | null = null;
let frame = 0;

function trackPointer(event: MouseEvent) {
  // Fresh pointer input supersedes a hover check queued by an earlier scroll.
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  pointer = { x: event.clientX, y: event.clientY };
}

function dismiss() {
  for (const setOpen of triggers.values()) setOpen(false);
}

function reconcileHover() {
  frame = 0;
  const hit = pointer
    ? document.elementFromPoint?.(pointer.x, pointer.y)
    : null;
  for (const [trigger, setOpen] of triggers)
    setOpen(!!hit && trigger.contains(hit));
}

function onScroll() {
  dismiss();
  if (pointer && !frame) frame = requestAnimationFrame(reconcileHover);
}

function onWheel(event: WheelEvent) {
  trackPointer(event);
  dismiss();
}

/** Recheck the actual element under a stationary pointer after content scrolls. */
export function watchPreviewTooltipScroll(
  trigger: HTMLButtonElement,
  setOpen: (open: boolean) => void
) {
  if (!triggers.size) {
    window.addEventListener('pointermove', trackPointer, true);
    window.addEventListener('mousemove', trackPointer, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: true });
  }
  triggers.set(trigger, setOpen);
  return () => {
    triggers.delete(trigger);
    if (triggers.size) return;
    window.removeEventListener('pointermove', trackPointer, true);
    window.removeEventListener('mousemove', trackPointer, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('wheel', onWheel, true);
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
  };
}
