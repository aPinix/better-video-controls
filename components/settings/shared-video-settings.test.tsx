// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { SharedVideoSettings } from './shared-video-settings';

afterEach(cleanup);

it('places the thumbnail time selector inside Hover Thumbnails and selects Time by default', async () => {
  const user = userEvent.setup();
  const { rerender } = render(
    <SharedVideoSettings
      extensionEnabled
      instagram={preferences()}
      tiktok={preferences()}
      youtube={preferences()}
    />
  );
  const section = screen.getByRole('region', { name: 'Hover Thumbnails' });
  const selector = within(section).getByRole('combobox', {
    name: 'Time below thumbnail',
  });
  expect(selector.textContent).toContain('Time');
  const onChange = vi.fn();
  rerender(
    <SharedVideoSettings
      extensionEnabled
      instagram={preferences()}
      onThumbnailTimeDisplayChange={onChange}
      thumbnailTimeDisplay="both"
      tiktok={preferences()}
      youtube={preferences()}
    />
  );
  expect(selector.textContent).toContain('Both');
  await user.click(selector);
  await user.click(await screen.findByRole('option', { name: 'None' }));
  expect(onChange).toHaveBeenCalledWith('none');
});

function preferences() {
  return {
    thumbnailPreviewEnabled: false,
    onThumbnailPreviewEnabledChange: vi.fn(),
    playbackSpeed: 1,
    onPlaybackSpeedChange: vi.fn(),
    autoSkip: false,
    onAutoSkipChange: vi.fn(),
    showPlaybackSpeed: false,
    onShowPlaybackSpeedChange: vi.fn(),
    showAutoSkip: false,
    onShowAutoSkipChange: vi.fn(),
  };
}

it('changes switches only when the toggle is clicked, not its text', async () => {
  const user = userEvent.setup();
  const platforms = {
    youtube: preferences(),
    instagram: { ...preferences(), autoSkip: true },
    tiktok: { ...preferences(), autoSkip: true },
  };
  render(<SharedVideoSettings extensionEnabled {...platforms} />);
  for (const toggle of screen.getAllByRole('switch')) {
    const text = toggle.parentElement?.querySelector('span');
    expect(text).toBeTruthy();
    if (text) await user.click(text);
  }
  for (const platform of Object.values(platforms)) {
    expect(platform.onThumbnailPreviewEnabledChange).not.toHaveBeenCalled();
    expect(platform.onShowPlaybackSpeedChange).not.toHaveBeenCalled();
    expect(platform.onAutoSkipChange).not.toHaveBeenCalled();
    expect(platform.onShowAutoSkipChange).not.toHaveBeenCalled();
  }
  await user.click(
    screen.getByRole('switch', { name: 'Hover Thumbnails on YouTube' })
  );
  expect(platforms.youtube.onThumbnailPreviewEnabledChange).toHaveBeenCalled();
});

it('shows each feature once and keeps all three thumbnail preferences independent', () => {
  const platforms = {
    youtube: preferences(),
    instagram: preferences(),
    tiktok: preferences(),
  };
  platforms.youtube.thumbnailPreviewEnabled = true;
  const { container } = render(
    <SharedVideoSettings extensionEnabled {...platforms} />
  );
  expect(container.querySelectorAll('.card-list-item')).toHaveLength(3);
  for (const title of ['Hover Thumbnails', 'Playback Speed', 'Auto-Skip']) {
    expect(screen.getAllByText(title)).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: `Preview ${title}` })
    ).toBeTruthy();
  }
  expect(
    screen
      .getByRole('switch', { name: 'Hover Thumbnails on YouTube' })
      .getAttribute('aria-checked')
  ).toBe('true');
  for (const [key, name] of [
    ['youtube', 'YouTube'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
  ] as const) {
    fireEvent.click(
      screen.getByRole('switch', { name: `Hover Thumbnails on ${name}` })
    );
    expect(
      platforms[key].onThumbnailPreviewEnabledChange
    ).toHaveBeenCalledExactlyOnceWith(key !== 'youtube', expect.anything());
  }
});

it.each(['Instagram', 'TikTok'])(
  'keeps %s feature behavior separate from control visibility',
  (name) => {
    const instagram = preferences();
    const tiktok = preferences();
    const { rerender } = render(
      <SharedVideoSettings
        extensionEnabled
        instagram={instagram}
        tiktok={tiktok}
        youtube={preferences()}
      />
    );
    const selected = name === 'Instagram' ? instagram : tiktok;
    const other = name === 'Instagram' ? tiktok : instagram;
    const visibility = screen.getByRole('switch', {
      name: `Show ${name} auto-skip on page`,
    });
    expect(visibility.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(visibility);
    expect(selected.onShowAutoSkipChange).not.toHaveBeenCalled();
    selected.autoSkip = true;
    rerender(
      <SharedVideoSettings
        extensionEnabled
        instagram={instagram}
        tiktok={tiktok}
        youtube={preferences()}
      />
    );
    expect(visibility.getAttribute('aria-disabled')).not.toBe('true');
    expect(
      screen
        .getByRole('switch', {
          name: `Show ${name === 'Instagram' ? 'TikTok' : 'Instagram'} auto-skip on page`,
        })
        .getAttribute('aria-disabled')
    ).toBe('true');
    fireEvent.click(
      screen.getByRole('switch', {
        name: `Show ${name} playback speed on page`,
      })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: `Show ${name} auto-skip on page` })
    );
    expect(selected.onShowPlaybackSpeedChange).toHaveBeenCalledWith(
      true,
      expect.anything()
    );
    expect(selected.onShowAutoSkipChange).toHaveBeenCalledWith(
      true,
      expect.anything()
    );
    expect(selected.onAutoSkipChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: `${name} auto-skip` }));
    expect(selected.onAutoSkipChange).toHaveBeenCalledWith(
      false,
      expect.anything()
    );
    selected.autoSkip = false;
    selected.showAutoSkip = true;
    rerender(
      <SharedVideoSettings
        extensionEnabled
        instagram={instagram}
        tiktok={tiktok}
        youtube={preferences()}
      />
    );
    expect(visibility.getAttribute('aria-disabled')).toBe('true');
    expect(visibility.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(visibility);
    expect(selected.onShowAutoSkipChange).toHaveBeenCalledTimes(1);
    expect(other.onAutoSkipChange).not.toHaveBeenCalled();
    expect(other.onShowPlaybackSpeedChange).not.toHaveBeenCalled();
    expect(other.onShowAutoSkipChange).not.toHaveBeenCalled();
  }
);

it('disables shared preferences with the extension', () => {
  render(
    <SharedVideoSettings
      extensionEnabled={false}
      instagram={preferences()}
      tiktok={preferences()}
      youtube={preferences()}
    />
  );
  for (const control of screen.getAllByRole('switch')) {
    expect(control.getAttribute('aria-disabled')).toBe('true');
  }
  expect(
    screen
      .getByRole('slider', { name: 'Instagram playback speed' })
      .closest('fieldset')?.disabled
  ).toBe(true);
});

it.each(['Instagram', 'TikTok'])(
  'adjusts %s speed through supported slider steps independently',
  (name) => {
    const instagram = preferences();
    const tiktok = preferences();
    const { rerender } = render(
      <SharedVideoSettings
        extensionEnabled
        instagram={instagram}
        tiktok={tiktok}
        youtube={preferences()}
      />
    );
    const slider = screen.getByRole('slider', {
      name: `${name} playback speed`,
    });
    expect(slider.getAttribute('aria-valuetext')).toBe('1×');
    const reset = screen.getByRole('button', {
      name: `Reset ${name} playback speed to 1×`,
    }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    const selected = name === 'Instagram' ? instagram : tiktok;
    const other = name === 'Instagram' ? tiktok : instagram;
    expect(selected.onPlaybackSpeedChange).toHaveBeenCalledWith(1.25);
    expect(other.onPlaybackSpeedChange).not.toHaveBeenCalled();
    expect(selected.onShowPlaybackSpeedChange).not.toHaveBeenCalled();
    selected.playbackSpeed = 1.5;
    rerender(
      <SharedVideoSettings
        extensionEnabled
        instagram={instagram}
        tiktok={tiktok}
        youtube={preferences()}
      />
    );
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(selected.onPlaybackSpeedChange).toHaveBeenLastCalledWith(1);
    expect(other.onPlaybackSpeedChange).not.toHaveBeenCalled();
  }
);
