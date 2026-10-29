import type { MiniPlayerGeometry } from './mini-player-settings';
import { clamp } from './player-tools-settings';

export const MINI_PLAYER_CORNERS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;
export type MiniPlayerCorner = (typeof MINI_PLAYER_CORNERS)[number];

export function resizeMiniGeometry(
  original: MiniPlayerGeometry,
  corner: MiniPlayerCorner,
  dx: number,
  dy: number,
  aspect: number,
  viewportWidth: number,
  viewportHeight: number,
  top: number
): MiniPlayerGeometry {
  const left = corner.endsWith('left');
  const above = corner.startsWith('top');
  const anchorX = original.x + (left ? original.width : 0);
  const anchorY = original.y + (above ? original.width / aspect : 0);
  const horizontal = dx * (left ? -1 : 1);
  const vertical = dy * aspect * (above ? -1 : 1);
  const delta =
    Math.abs(horizontal) >= Math.abs(vertical) ? horizontal : vertical;
  const maxWidth = Math.max(
    1,
    Math.min(
      left ? anchorX - 8 : viewportWidth - 8 - anchorX,
      (above ? anchorY - top : viewportHeight - 8 - anchorY) * aspect
    )
  );
  const width = clamp(
    original.width + delta,
    Math.min(240, maxWidth),
    maxWidth
  );
  return {
    width,
    x: left ? anchorX - width : anchorX,
    y: above ? anchorY - width / aspect : anchorY,
  };
}

export function flickMiniGeometry(
  original: MiniPlayerGeometry,
  vx: number,
  vy: number,
  aspect: number,
  viewportWidth: number,
  viewportHeight: number,
  top: number
): MiniPlayerGeometry {
  const right =
    Math.abs(vx) > Math.abs(vy) * 0.25
      ? vx > 0
      : original.x + original.width / 2 > viewportWidth / 2;
  const below =
    Math.abs(vy) > Math.abs(vx) * 0.25
      ? vy > 0
      : original.y + original.width / aspect / 2 > (top + viewportHeight) / 2;
  return {
    ...original,
    x: right ? viewportWidth - original.width - 8 : 8,
    y: below ? viewportHeight - original.width / aspect - 8 : top,
  };
}
