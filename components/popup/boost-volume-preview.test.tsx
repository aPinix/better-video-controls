// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BoostVolumePreview } from './boost-volume-preview';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([2, 3, 5])(
  'animates to the selected %s times level and warns only from 300 percent',
  (level) => {
    let tick: FrameRequestCallback = () => {};
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      tick = callback;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const { container } = render(<BoostVolumePreview level={level} />);
    const counter = container.querySelector('.tabular-nums');
    expect(counter?.textContent).toBe('100%');
    act(() => tick(2800));
    expect(counter?.textContent).toBe(`${level * 100}%`);
    expect(container.textContent?.includes('May distort audio')).toBe(
      level >= 3
    );
    act(() => tick(5400));
    expect(counter?.textContent).toBe('100%');
    expect(container.textContent).not.toContain('May distort audio');
  }
);
