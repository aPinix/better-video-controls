// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CINEMA_PREVIEW_KEY } from '@/helpers/player-cinema-preview';
import { useCinemaDimmingPreview } from './use-cinema-dimming-preview';

const set = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  set.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('chrome', { storage: { local: { set } } });
});
afterEach(async () => {
  cleanup();
  await act(() => vi.advanceTimersByTimeAsync(0));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('sends current slider values, sustains a stationary drag, and ends in order on release', async () => {
  const { result } = renderHook(() => useCinemaDimmingPreview());
  await act(async () => {
    result.current.update(20);
    result.current.update(45);
  });
  expect(
    set.mock.calls.map(([value]) => value[CINEMA_PREVIEW_KEY].dimming)
  ).toEqual([20, 45]);
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(set.mock.calls.at(-1)?.[0][CINEMA_PREVIEW_KEY]).toMatchObject({
    active: true,
    dimming: 45,
  });
  await act(async () => result.current.end());
  expect(set.mock.calls.at(-1)?.[0][CINEMA_PREVIEW_KEY]).toMatchObject({
    active: false,
    dimming: 45,
  });
  const calls = set.mock.calls.length;
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(set).toHaveBeenCalledTimes(calls);
  expect(set.mock.calls.every(([value]) => !('playerTools' in value))).toBe(
    true
  );
});
it('ends an unfinished drag on unmount and surfaces failed preview updates', async () => {
  const { result, unmount } = renderHook(() => useCinemaDimmingPreview());
  set.mockRejectedValueOnce(new Error('Storage unavailable'));
  await act(async () => result.current.update(35));
  expect(result.current.error).toBe(
    'Could not preview page dimming on YouTube.'
  );
  await act(async () => result.current.update(50));
  expect(result.current.error).toBe('');
  unmount();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(set.mock.calls.at(-1)?.[0][CINEMA_PREVIEW_KEY]).toMatchObject({
    active: false,
    dimming: 50,
  });
});
