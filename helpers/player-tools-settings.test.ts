import { expect, it } from 'vitest';
import {
  DEFAULT_PLAYER_TOOLS,
  normalizePlayerTools,
} from './player-tools-settings';

it('defaults arrows to five seconds and J/L to ten while preserving custom intervals', () => {
  const defaults = normalizePlayerTools({});
  expect(defaults.backward).toBe(5);
  expect(defaults.forward).toBe(5);
  expect(defaults.jlSeekInterval).toBe(10);
  const saved = normalizePlayerTools({ backward: 7, jlSeekInterval: 15 });
  expect(saved.backward).toBe(7);
  expect(saved.forward).toBe(7);
  expect(saved.jlSeekInterval).toBe(15);
});

it('caps saved boosts at 5 times while retaining the 2 times default', () => {
  expect(DEFAULT_PLAYER_TOOLS.youtubeBoost).toBe(2);
  for (const youtubeBoost of [2, 3, 4, 5])
    expect(normalizePlayerTools({ youtubeBoost }).youtubeBoost).toBe(
      youtubeBoost
    );
  for (const youtubeBoost of [6, 7, 10])
    expect(normalizePlayerTools({ youtubeBoost }).youtubeBoost).toBe(5);
  for (const youtubeBoost of [undefined, null, '5', 2.5, -1])
    expect(normalizePlayerTools({ youtubeBoost }).youtubeBoost).toBe(2);
});

it('enables Boost Volume and Loop Sections by default without starting automatic boost', () => {
  for (const settings of [
    DEFAULT_PLAYER_TOOLS,
    normalizePlayerTools(undefined),
    normalizePlayerTools({ dimming: 65 }),
  ]) {
    expect(settings.youtubeBoostEnabled).toBe(true);
    expect(settings.youtubeLoop).toBe(true);
    expect(settings.rememberYoutubeLoops).toBe(true);
    expect(settings.youtubeBookmarksEnabled).toBe(true);
    expect(settings.youtubeInfoCardsEnabled).toBe(true);
    expect(settings.hideEndScreens).toBe(false);
    expect(settings.youtubeAutoBoost).toBe(false);
    expect(settings.miniPlayer).toBe(true);
    expect(settings.youtubePipOverride).toBe(false);
    expect(settings.youtubePipMode).toBe('mini-player');
    expect(settings.youtubePipAutoOnTabChange).toBe(true);
    expect(settings.youtubeScreenshotEnabled).toBe(true);
    expect(settings.youtubeFiltersEnabled).toBe(true);
    expect(settings.youtubeScreenshotIncludeFilters).toBe(true);
    expect(settings.youtubeScreenshotFormat).toBe('jpeg');
  }
});
it('preserves PNG and disabled screenshot effects, and defaults unknown formats to JPEG', () => {
  const settings = normalizePlayerTools({
    youtubeScreenshotFormat: 'png',
    youtubeScreenshotIncludeFilters: false,
  });
  expect(settings.youtubeScreenshotFormat).toBe('png');
  expect(settings.youtubeScreenshotIncludeFilters).toBe(false);
  expect(
    normalizePlayerTools({ youtubeScreenshotFormat: 'webp' })
      .youtubeScreenshotFormat
  ).toBe('jpeg');
});
it('preserves an explicitly disabled loop saving preference', () => {
  expect(
    normalizePlayerTools({ rememberYoutubeLoops: false }).rememberYoutubeLoops
  ).toBe(false);
});
it('preserves an explicitly disabled PiP tab-change sub-option', () => {
  expect(
    normalizePlayerTools({
      youtubePipOverride: true,
      youtubePipAutoOnTabChange: false,
    }).youtubePipAutoOnTabChange
  ).toBe(false);
});
it('preserves Chrome video PiP and falls back to Mini Player for unknown player modes', () => {
  expect(
    normalizePlayerTools({ youtubePipMode: 'chrome-video' }).youtubePipMode
  ).toBe('chrome-video');
  expect(
    normalizePlayerTools({ youtubePipMode: 'unknown' }).youtubePipMode
  ).toBe('mini-player');
});

it('preserves saved button choices and dimming', () => {
  const settings = normalizePlayerTools({
    youtubeBoostEnabled: false,
    youtubeLoop: false,
    youtubeBookmarksEnabled: false,
    dimming: 65,
    hideEndScreens: true,
    miniPlayer: false,
    youtubeScreenshotEnabled: false,
    youtubeFiltersEnabled: false,
    youtubeScreenshotIncludeFilters: true,
  });
  expect(settings.youtubeBoostEnabled).toBe(false);
  expect(settings.youtubeLoop).toBe(false);
  expect(settings.youtubeBookmarksEnabled).toBe(false);
  expect(settings.dimming).toBe(65);
  expect(settings.hideEndScreens).toBe(true);
  expect(settings.miniPlayer).toBe(false);
  expect(settings.youtubeScreenshotEnabled).toBe(false);
  expect(settings.youtubeFiltersEnabled).toBe(false);
  expect(settings.youtubeScreenshotIncludeFilters).toBe(true);
});

it('defaults the Cinema color to black, preserves valid saved colors and rejects invalid values', () => {
  expect(normalizePlayerTools(undefined).cinemaColor).toBe('#000000');
  expect(
    normalizePlayerTools({ cinemaColor: '#ABCDEF', dimming: 65 }).cinemaColor
  ).toBe('#abcdef');
  for (const cinemaColor of ['red', '#fff', 'url(example.com)', null, 42])
    expect(normalizePlayerTools({ cinemaColor }).cinemaColor).toBe('#000000');
});
