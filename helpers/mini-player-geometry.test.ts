import { describe, expect, it } from 'vitest';
import {
  flickMiniGeometry,
  MINI_PLAYER_CORNERS,
  resizeMiniGeometry,
} from './mini-player-geometry';

describe('Mini Player corner resizing', () => {
  it.each(MINI_PLAYER_CORNERS)(
    'keeps %s resizing within the viewport with its opposite corner fixed',
    (corner) => {
      const original = { x: 300, y: 200, width: 360 };
      const left = corner.endsWith('left');
      const top = corner.startsWith('top');
      const aspect = 16 / 9;
      const next = resizeMiniGeometry(
        original,
        corner,
        left ? -2000 : 2000,
        top ? -2000 : 2000,
        aspect,
        1024,
        768,
        64
      );
      expect(next.x).toBeGreaterThanOrEqual(8);
      expect(next.y).toBeGreaterThanOrEqual(64);
      expect(next.x + next.width).toBeLessThanOrEqual(1016);
      expect(next.y + next.width / aspect).toBeLessThanOrEqual(760);
      expect(next.x + (left ? next.width : 0)).toBeCloseTo(
        original.x + (left ? original.width : 0)
      );
      expect(next.y + (top ? next.width / aspect : 0)).toBeCloseTo(
        original.y + (top ? original.width / aspect : 0)
      );
    }
  );
  it.each([16 / 9, 9 / 16, 4 / 3])(
    'accepts vertical-only drags for aspect %s',
    (aspect) => {
      const next = resizeMiniGeometry(
        { x: 16, y: 64, width: 240 },
        'bottom-right',
        0,
        20,
        aspect,
        1024,
        900,
        64
      );
      expect(next.width).toBeCloseTo(240 + 20 * aspect);
      expect(next.x).toBe(16);
      expect(next.y).toBe(64);
    }
  );
  it('allows a small viewport to fit below the normal minimum', () => {
    const next = resizeMiniGeometry(
      { x: 8, y: 64, width: 200 },
      'bottom-right',
      1000,
      1000,
      16 / 9,
      220,
      200,
      64
    );
    expect(next.width).toBe(204);
    expect(next.y + next.width / (16 / 9)).toBeLessThanOrEqual(192);
  });
  it('limits shrinking without moving the anchor', () => {
    const next = resizeMiniGeometry(
      { x: 300, y: 200, width: 360 },
      'top-left',
      1000,
      1000,
      16 / 9,
      1024,
      768,
      64
    );
    expect(next.width).toBe(240);
    expect(next.x + next.width).toBe(660);
    expect(next.y + next.width / (16 / 9)).toBeCloseTo(402.5);
  });
});

describe('Mini Player flick destinations', () => {
  it('uses the nearer vertical corner for a horizontal flick', () => {
    const next = flickMiniGeometry(
      { x: 300, y: 500, width: 360 },
      -2,
      0,
      16 / 9,
      1024,
      768,
      64
    );
    expect(next).toEqual({ x: 8, y: 557.5, width: 360 });
  });
  it('uses the nearer horizontal corner for a vertical flick', () => {
    const next = flickMiniGeometry(
      { x: 600, y: 300, width: 360 },
      0,
      -2,
      16 / 9,
      1024,
      768,
      64
    );
    expect(next).toEqual({ x: 656, y: 64, width: 360 });
  });
});
