// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCarouselIndicator } from './use-carousel-indicator';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Fixture({ initial = 0 }: { initial?: number }) {
  const carousel = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!carousel.current) return;
    Object.defineProperty(carousel.current, 'clientWidth', { value: 400 });
    Object.defineProperty(carousel.current, 'scrollWidth', { value: 800 });
    carousel.current.scrollLeft = initial;
  }, [initial]);
  useCarouselIndicator(carousel, indicator);
  return (
    <>
      <div data-testid="carousel" ref={carousel}>
        <div data-testid="nested" />
      </div>
      <span data-testid="indicator" ref={indicator} />
    </>
  );
}

it('tracks fractional drag positions in both directions, including before the halfway point', () => {
  const { getByTestId } = render(<Fixture />);
  const carousel = getByTestId('carousel');
  const indicator = getByTestId('indicator');
  for (const position of [0, 40, 100, 200, 300, 400, 300, 100, 0]) {
    carousel.scrollLeft = position;
    fireEvent.scroll(carousel);
    expect(indicator.style.transform).toBe(
      `translateX(${(position / 400) * 100}%)`
    );
  }
});

it('restores the Domains highlight, ignores nested scrolling and follows native overscroll', () => {
  const { getByTestId } = render(<Fixture initial={400} />);
  const carousel = getByTestId('carousel');
  const indicator = getByTestId('indicator');
  expect(indicator.style.transform).toBe('translateX(100%)');
  carousel.scrollLeft = 200;
  fireEvent.scroll(getByTestId('nested'));
  expect(indicator.style.transform).toBe('translateX(100%)');
  carousel.scrollLeft = 450;
  fireEvent.scroll(carousel);
  expect(indicator.style.transform).toBe('translateX(112.5%)');
  carousel.scrollLeft = -20;
  fireEvent.scroll(carousel);
  expect(indicator.style.transform).toBe('translateX(-5%)');
});

it('stays at the actual position when scrolling pauses or ends', async () => {
  vi.useFakeTimers();
  const { getByTestId } = render(<Fixture />);
  const carousel = getByTestId('carousel');
  const indicator = getByTestId('indicator');
  const animate = vi.fn();
  Object.defineProperty(indicator, 'animate', { value: animate });
  for (const position of [120, 240, 440, 400, -24, 0]) {
    carousel.scrollLeft = position;
    fireEvent.scroll(carousel);
    fireEvent(carousel, new Event('scrollend'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(indicator.style.transform).toBe(
      `translateX(${(position / 400) * 100}%)`
    );
  }
  expect(animate).not.toHaveBeenCalled();
});

it('does not move independently in response to wheel input', async () => {
  vi.useFakeTimers();
  const { getByTestId } = render(<Fixture />);
  const carousel = getByTestId('carousel');
  const indicator = getByTestId('indicator');
  fireEvent.wheel(carousel, { deltaX: -80 });
  await vi.advanceTimersByTimeAsync(1000);
  expect(indicator.style.transform).toBe('translateX(0%)');
});
