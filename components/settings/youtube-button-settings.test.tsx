// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CINEMA_PREVIEW_KEY } from '@/helpers/player-cinema-preview';
import {
  YOUTUBE_CONTROL_SHORTCUTS,
  YOUTUBE_PIP_OVERRIDE_SHORTCUT,
} from '@/helpers/youtube-control-icons';
import { YouTubeBookmarksSetting } from './youtube-bookmarks-setting';
import { YouTubeBoostSetting } from './youtube-boost-setting';
import { YouTubeCinemaSetting } from './youtube-cinema-setting';
import { YouTubeFiltersSetting } from './youtube-filters-setting';
import { YouTubeInfoCardsSetting } from './youtube-info-cards-setting';
import { YouTubeScreenshotSetting } from './youtube-screenshot-setting';
import { YouTubeSettings } from './youtube-settings';

let preferences: Record<string, unknown>;
const set = vi.fn();
const get = vi.fn();
const localSet = vi.fn();
const changed = { addListener: vi.fn(), removeListener: vi.fn() };
beforeEach(() => {
  localSet.mockReset().mockResolvedValue(undefined);
  preferences = {
    hideEndScreens: true,
    hideCards: false,
    dimming: 65,
    backward: 8,
  };
  set.mockReset().mockImplementation(async (data) => {
    preferences = data.playerTools;
  });
  get
    .mockReset()
    .mockImplementation(async () => ({ playerTools: preferences }));
  changed.addListener.mockClear();
  vi.stubGlobal('chrome', {
    storage: {
      sync: { get, set },
      local: { get: async () => ({}), set: localSet },
      onChanged: changed,
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const readySwitch = async (name: string) => {
  const toggle = screen.getByRole('switch', { name });
  await waitFor(() =>
    expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
  );
  return toggle;
};

describe('YouTube button settings', () => {
  it('warns at 3 times boost and clears the warning when boost is lowered', async () => {
    preferences.youtubeBoost = 2;
    render(<YouTubeBoostSetting />);
    await readySwitch('Show Boost Volume button on YouTube');
    const slider = screen.getByRole('slider', { name: 'Volume boost multiplier' });
    expect(slider.getAttribute('max') ?? slider.getAttribute('aria-valuemax')).toBe('5');
    expect(screen.queryByText(/High boost may distort the sound/)).toBeNull();
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(preferences.youtubeBoost).toBe(3));
    expect(screen.getByRole('status').textContent).toContain('High boost may distort the sound');
    expect(slider.getAttribute('aria-valuetext')).toContain('may distort');
    await readySwitch('Show Boost Volume button on YouTube');
    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(preferences.youtubeBoost).toBe(2));
    expect(screen.queryByText(/High boost may distort the sound/)).toBeNull();
    expect(slider.getAttribute('aria-valuetext')).toBe('2 times');
  });
  it('starts a tab-only preview on slider press and ends it on release even without changing the value', async () => {
    render(<YouTubeCinemaSetting />);
    await readySwitch('Show Cinema Mode button on YouTube');
    const slider = screen.getByRole('slider', { name: 'Cinema page dimming' });
    // jsdom has no native pointer-capture API used by Base UI's slider.
    for (const node of document.querySelectorAll<HTMLElement>(
      '[data-slot="app-slider"], [data-slot="app-slider"] *'
    )) {
      node.hasPointerCapture = () => false;
      node.setPointerCapture = () => {};
      node.releasePointerCapture = () => {};
    }
    fireEvent.pointerDown(slider, { button: 0 });
    await waitFor(() =>
      expect(localSet).toHaveBeenCalledWith({
        [CINEMA_PREVIEW_KEY]: expect.objectContaining({
          active: true,
          dimming: 65,
        }),
      })
    );
    expect(set).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { button: 0 });
    await waitFor(() =>
      expect(localSet.mock.calls.at(-1)?.[0][CINEMA_PREVIEW_KEY].active).toBe(
        false
      )
    );
    expect(document.querySelector('.shade')).toBeNull();
  });
  it('shows the actual player hotkey beside every button feature, without changing switch names', async () => {
    render(
      <YouTubeSettings
        chapteredTimelineEnabled
        extensionEnabled
        onChapteredTimelineEnabledChange={vi.fn()}
        onOpenSavedLibrary={vi.fn()}
      />
    );
    await readySwitch('Show Cinema Mode button on YouTube');
    for (const [feature, shortcut] of Object.entries(
      YOUTUBE_CONTROL_SHORTCUTS
    )) {
      const key = feature === 'pip' ? YOUTUBE_PIP_OVERRIDE_SHORTCUT : shortcut;
      expect(
        screen.getByLabelText(`YouTube shortcut: ${key.toUpperCase()}`).tagName
      ).toBe('KBD');
    }
    expect(
      screen.getByRole('switch', { name: 'Show Cinema Mode button on YouTube' })
    ).toBeTruthy();
    expect(
      screen.getByText('Mini Player').parentElement?.querySelector('kbd')
    ).toBeNull();
  });
  it('saves color choices without dimming the Settings page', async () => {
    render(<YouTubeCinemaSetting />);
    await readySwitch('Show Cinema Mode button on YouTube');
    const originalNodes = [...document.body.children];
    fireEvent.click(
      screen.getByRole('button', { name: 'Ocean Cinema Mode preset' })
    );
    await waitFor(() => expect(preferences.cinemaColor).toBe('#172554'));
    expect([...document.body.children]).toEqual(originalNodes);
    expect(document.querySelector('.shade')).toBeNull();
  });
  it('defaults Bookmarks on, preserves the saved choice, and reports storage errors', async () => {
    render(<YouTubeBookmarksSetting />);
    const toggle = await readySwitch('Show Bookmarks button on YouTube');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(preferences.youtubeBookmarksEnabled).toBe(false)
    );
    expect(preferences.hideEndScreens).toBe(true);
    cleanup();
    render(<YouTubeBookmarksSetting />);
    const restored = await readySwitch('Show Bookmarks button on YouTube');
    expect(restored.getAttribute('aria-checked')).toBe('false');
    set.mockRejectedValueOnce(new Error('Storage unavailable'));
    fireEvent.click(restored);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save Bookmarks settings.'
    );
    await waitFor(() =>
      expect(restored.getAttribute('aria-checked')).toBe('false')
    );
  });
  it('saves Cinema preset and custom colors without changing dimming and reports storage errors', async () => {
    render(<YouTubeCinemaSetting />);
    await readySwitch('Show Cinema Mode button on YouTube');
    expect(
      screen
        .getByRole('button', { name: 'Cinema Cinema Mode preset' })
        .getAttribute('aria-pressed')
    ).toBe('true');
    fireEvent.click(
      screen.getByRole('button', { name: 'Ocean Cinema Mode preset' })
    );
    await waitFor(() => expect(preferences.cinemaColor).toBe('#172554'));
    expect(preferences.dimming).toBe(65);
    const custom = screen.getByLabelText('Custom Cinema Mode color');
    expect(custom.getAttribute('type')).toBe('color');
    fireEvent.click(custom);
    await waitFor(() =>
      expect(custom.closest('label')?.hasAttribute('data-selected')).toBe(true)
    );
    expect(custom.closest('label')?.classList.contains('ring-2')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Ocean Cinema Mode preset' })
        .getAttribute('aria-pressed')
    ).toBe('false');
    fireEvent.change(custom, { target: { value: '#abcdef' } });
    await waitFor(() => expect(preferences.cinemaColor).toBe('#abcdef'));
    set.mockRejectedValueOnce(new Error('Storage failed'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Sunset Cinema Mode preset' })
    );
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Could not save Cinema Mode settings.'
    );
    expect(preferences.cinemaColor).toBe('#abcdef');
    expect(preferences.dimming).toBe(65);
    fireEvent.change(custom, { target: { value: '#000000' } });
    await waitFor(() => expect(preferences.cinemaColor).toBe('#000000'));
    expect(custom.closest('label')?.hasAttribute('data-selected')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Cinema Cinema Mode preset' })
        .getAttribute('aria-pressed')
    ).toBe('false');
  });
  it('temporarily shows the hovered Cinema preset and reverts to the selected name', async () => {
    render(<YouTubeCinemaSetting />);
    await readySwitch('Show Cinema Mode button on YouTube');
    expect(screen.getByText('(Cinema)')).toBeTruthy();
    const sunset = screen.getByRole('button', {
      name: 'Sunset Cinema Mode preset',
    });
    fireEvent.mouseEnter(sunset);
    expect(screen.getByText('(Sunset)')).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
    fireEvent.mouseLeave(sunset);
    expect(screen.getByText('(Cinema)')).toBeTruthy();
    fireEvent.click(sunset);
    await waitFor(() =>
      expect(sunset.getAttribute('aria-pressed')).toBe('true')
    );
    expect(screen.getByText('(Sunset)')).toBeTruthy();
    const ocean = screen.getByRole('button', {
      name: 'Ocean Cinema Mode preset',
    });
    fireEvent.mouseEnter(ocean);
    expect(screen.getByText('(Ocean)')).toBeTruthy();
    fireEvent.mouseLeave(ocean);
    expect(screen.getByText('(Sunset)')).toBeTruthy();
    const custom = screen.getByLabelText('Custom Cinema Mode color');
    fireEvent.mouseEnter(custom.closest('label') as HTMLLabelElement);
    expect(screen.getByText('(Custom: #431407)')).toBeTruthy();
    fireEvent.mouseLeave(custom.closest('label') as HTMLLabelElement);
    expect(screen.getByText('(Sunset)')).toBeTruthy();
  });
  it('persists screenshot filter effects independently of both button choices', async () => {
    preferences.youtubeScreenshotIncludeFilters = false;
    render(
      <>
        <YouTubeScreenshotSetting />
        <YouTubeFiltersSetting />
      </>
    );
    const effects = await readySwitch(
      'Include video filter effects in screenshots'
    );
    expect(effects.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByText('Include video filter effects'));
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(effects);
    await waitFor(() =>
      expect(preferences.youtubeScreenshotIncludeFilters).toBe(true)
    );
    fireEvent.click(await readySwitch('Show Video Filters button on YouTube'));
    await waitFor(() => expect(preferences.youtubeFiltersEnabled).toBe(false));
    expect(preferences.youtubeScreenshotIncludeFilters).toBe(true);
    fireEvent.click(await readySwitch('Show Screenshot button on YouTube'));
    await waitFor(() =>
      expect(
        screen.queryByRole('switch', {
          name: 'Include video filter effects in screenshots',
        })
      ).toBeNull()
    );
    expect(preferences.youtubeScreenshotIncludeFilters).toBe(true);
    cleanup();
    render(<YouTubeFiltersSetting />);
    expect(
      (await readySwitch('Show Video Filters button on YouTube')).getAttribute(
        'aria-checked'
      )
    ).toBe('false');
  });
  it('reports effects storage failures without changing the saved screenshot choice', async () => {
    set.mockRejectedValueOnce(new Error('Storage unavailable'));
    render(<YouTubeScreenshotSetting />);
    const effects = await readySwitch(
      'Include video filter effects in screenshots'
    );
    fireEvent.click(effects);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save Screenshot settings.'
    );
    await waitFor(() =>
      expect(effects.getAttribute('aria-disabled')).not.toBe('true')
    );
    expect(effects.getAttribute('aria-checked')).toBe('true');
    expect(preferences.youtubeScreenshotIncludeFilters).toBeUndefined();
  });
  it('enables Screenshot by default and persists its availability without changing other preferences', async () => {
    render(<YouTubeScreenshotSetting />);
    const toggle = await readySwitch('Show Screenshot button on YouTube');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(preferences.youtubeScreenshotEnabled).toBe(false)
    );
    expect(preferences).toMatchObject({
      hideEndScreens: true,
      dimming: 65,
      backward: 8,
    });
    cleanup();
    render(<YouTubeScreenshotSetting />);
    expect(
      (await readySwitch('Show Screenshot button on YouTube')).getAttribute(
        'aria-checked'
      )
    ).toBe('false');
  });
  it('defaults to JPEG and saves PNG independently of filter effects', async () => {
    render(<YouTubeScreenshotSetting />);
    const effects = await readySwitch(
      'Include video filter effects in screenshots'
    );
    expect(effects.getAttribute('aria-checked')).toBe('true');
    expect(
      (screen.getByRole('radio', { name: 'JPEG' }) as HTMLInputElement).checked
    ).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'PNG' }));
    await waitFor(() =>
      expect(preferences.youtubeScreenshotFormat).toBe('png')
    );
    expect(preferences.youtubeScreenshotIncludeFilters).toBe(true);
    expect(
      (screen.getByRole('radio', { name: 'PNG' }) as HTMLInputElement).checked
    ).toBe(true);
  });
  it('reports Screenshot storage failures and restores the saved choice', async () => {
    set.mockRejectedValueOnce(new Error('Storage unavailable'));
    render(<YouTubeScreenshotSetting />);
    const toggle = await readySwitch('Show Screenshot button on YouTube');
    fireEvent.click(toggle);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save Screenshot settings.'
    );
    await waitFor(() =>
      expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
    );
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });
  it('defaults new buttons on while preserving existing visibility and dimming', async () => {
    render(
      <>
        <YouTubeCinemaSetting />
        <YouTubeInfoCardsSetting />
      </>
    );
    const cinema = await readySwitch('Show Cinema Mode button on YouTube');
    const cards = await readySwitch('Show End-screen cards button on YouTube');
    expect(cinema.getAttribute('aria-checked')).toBe('true');
    expect(cards.getAttribute('aria-checked')).toBe('true');
    expect(
      (
        screen.getByRole('slider', {
          name: 'Cinema page dimming',
        }) as HTMLInputElement
      ).value
    ).toBe('65');
    expect(set).not.toHaveBeenCalled();
    fireEvent.click(cards);
    fireEvent.click(cinema);
    await waitFor(() =>
      expect(preferences).toMatchObject({
        youtubeInfoCardsEnabled: false,
        youtubeCinemaEnabled: false,
      })
    );
    expect(preferences).toMatchObject({
      hideEndScreens: true,
      hideCards: false,
      dimming: 65,
      backward: 8,
    });
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    cleanup();
    render(
      <>
        <YouTubeCinemaSetting />
        <YouTubeInfoCardsSetting />
      </>
    );
    expect(
      (await readySwitch('Show Cinema Mode button on YouTube')).getAttribute(
        'aria-checked'
      )
    ).toBe('false');
    expect(
      (await readySwitch('Show End-screen cards button on YouTube')).getAttribute(
        'aria-checked'
      )
    ).toBe('false');
  });
  it('resets saved dimming to 90 without changing card visibility or availability', async () => {
    render(<YouTubeCinemaSetting />);
    await readySwitch('Show Cinema Mode button on YouTube');
    fireEvent.click(
      screen.getByRole('button', { name: 'Reset cinema dimming to 90 percent' })
    );
    await waitFor(() => expect(preferences.dimming).toBe(90));
    expect(preferences.hideEndScreens).toBe(true);
    expect(preferences.youtubeCinemaEnabled).toBe(true);
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('90');
  });
  it('reports failed writes and restores the saved availability', async () => {
    set.mockRejectedValueOnce(new Error('Storage quota exceeded'));
    render(<YouTubeInfoCardsSetting />);
    const toggle = await readySwitch('Show End-screen cards button on YouTube');
    fireEvent.click(toggle);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save End-screen cards settings.'
    );
    await waitFor(() =>
      expect(toggle.getAttribute('aria-disabled')).not.toBe('true')
    );
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(preferences.hideEndScreens).toBe(true);
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(preferences.youtubeInfoCardsEnabled).toBe(false)
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('reports failed loads and keeps controls unavailable', async () => {
    get.mockRejectedValue(new Error('Storage unavailable'));
    render(<YouTubeCinemaSetting />);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not load Cinema Mode settings.'
    );
    expect(screen.getByRole('switch').getAttribute('aria-disabled')).toBe(
      'true'
    );
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(
      true
    );
  });
  it('renders one shared preview, highlights the hovered or focused setting, and identifies the timeline', async () => {
    render(
      <YouTubeSettings
        chapteredTimelineEnabled
        extensionEnabled
        onChapteredTimelineEnabledChange={vi.fn()}
        onOpenSavedLibrary={vi.fn()}
      />
    );
    await readySwitch('Show End-screen cards button on YouTube');
    const featureSwitches = screen
      .getAllByRole('switch')
      .filter((node) => node.hasAttribute('data-youtube-control'));
    expect(
      featureSwitches.map((node) => node.getAttribute('aria-label'))
    ).toEqual([
      'Show Boost Volume button on YouTube',
      'Show Cinema Mode button on YouTube',
      'Show Loop Sections button on YouTube',
      'Show Bookmarks button on YouTube',
      'Show End-screen cards button on YouTube',
      'Show Screenshot button on YouTube',
      'Show Video Filters button on YouTube',
      'Use PiP Override on YouTube',
    ]);
    const preview = screen.getByRole('img', {
      name: 'YouTube player controls: Boost Volume, Cinema Mode, Loop Sections, Bookmarks, End-screen cards, Screenshot, Video Filters, Picture-in-Picture',
    });
    expect(
      preview.querySelector('button, input, [tabindex]:not([tabindex="-1"])')
    ).toBeNull();
    const video = preview.querySelector('video');
    expect(video?.getAttribute('src')).toBe('/video/video-preview.mp4');
    expect(video?.loop).toBe(true);
    expect(screen.queryByText('YouTube player buttons')).toBeNull();
    for (const feature of [
      'Boost Volume',
      'Cinema Mode',
      'Loop Sections',
      'Bookmarks',
      'End-screen cards',
      'Screenshot',
      'Video Filters',
    ]) {
      const toggle = screen.getByRole('switch', {
        name: `Show ${feature} button on YouTube`,
      });
      fireEvent.mouseOver(toggle);
      expect(preview.getAttribute('aria-label')).toBe(
        `YouTube player controls with ${feature} highlighted`
      );
    }
    fireEvent.focus(
      screen.getByRole('switch', { name: 'Show Cinema Mode button on YouTube' })
    );
    expect(preview.getAttribute('aria-label')).toBe(
      'YouTube player controls with Cinema Mode highlighted'
    );
    fireEvent.mouseOver(screen.getByText('Chaptered Timeline'));
    expect(preview.getAttribute('aria-label')).toBe(
      'YouTube player controls: Boost Volume, Cinema Mode, Loop Sections, Bookmarks, End-screen cards, Screenshot, Video Filters, Picture-in-Picture'
    );
    expect(
      screen.getByText(
        'Timeline feature: show YouTube chapter divisions and names'
      )
    ).toBeTruthy();
    for (const feature of [
      'Boost Volume',
      'Cinema Mode',
      'Loop Sections',
      'Bookmarks',
      'End-screen cards',
      'Screenshot',
      'Video Filters',
      'Mini Player',
      'PiP Override',
      'Chaptered Timeline',
      'Saved bookmarks & loops',
    ]) {
      expect(
        screen.getAllByRole('button', { name: `Preview ${feature}` })
      ).toHaveLength(1);
    }
  });
});
