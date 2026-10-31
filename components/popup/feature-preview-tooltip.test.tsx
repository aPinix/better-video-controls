// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_PREVIEW_DETAILS,
  type FeaturePreviewId,
} from './feature-preview';
import { FeaturePreviewTooltip } from './feature-preview-tooltip';

afterEach(cleanup);

describe('FeaturePreviewTooltip', () => {
  it('updates the boost preview maximum when the selected setting changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FeaturePreviewTooltip boostLevel={5} feature="boost" />
    );
    await user.hover(
      screen.getByRole('button', { name: 'Preview Boost Volume' })
    );
    const popup = await screen.findByLabelText('Boost Volume preview');
    expect(within(popup).getByText('500%')).toBeTruthy();
    rerender(<FeaturePreviewTooltip boostLevel={2} feature="boost" />);
    expect(within(popup).getByText('200%')).toBeTruthy();
    expect(within(popup).queryByText('500%')).toBeNull();
  });
  it.each(Object.keys(FEATURE_PREVIEW_DETAILS) as FeaturePreviewId[])(
    'opens a visual %s preview on hover and dismisses with Escape',
    async (feature) => {
      const user = userEvent.setup();
      const { title, description } = FEATURE_PREVIEW_DETAILS[feature];
      render(<FeaturePreviewTooltip feature={feature} />);
      const trigger = screen.getByRole('button', { name: `Preview ${title}` });
      expect(screen.queryByLabelText(`${title} preview`)).toBeNull();
      await user.hover(trigger);
      const popup = await screen.findByLabelText(`${title} preview`);
      expect(popup.getAttribute('aria-label')).toBe(`${title} preview`);
      expect(within(popup).getByRole('img')).toBeTruthy();
      if (feature !== 'library') {
        expect(popup.querySelector('video')?.getAttribute('src')).toBe(
          '/video/video-preview.mp4'
        );
      }
      if (feature === 'filters') {
        const videos = popup.querySelectorAll('video');
        expect(videos).toHaveLength(1);
        expect(videos[0]?.autoplay).toBe(true);
        expect(videos[0]?.loop).toBe(true);
        expect(
          videos[0]?.classList.contains('video-filters-preview-video')
        ).toBe(true);
      }
      if (feature === 'infoCards') {
        expect(within(popup).getByText('Recommendations visible')).toBeTruthy();
        expect(within(popup).getByText('Recommendations hidden')).toBeTruthy();
        expect(popup.textContent).not.toMatch(/enabled|disabled/i);
        expect(popup.querySelector('.lucide-eye-off')).toBeNull();
      }
      expect(within(popup).queryByText(description)).toBeNull();
      expect(within(popup).queryByRole('button')).toBeNull();
      expect(within(popup).queryByRole('switch')).toBeNull();
      expect(within(popup).queryByRole('slider')).toBeNull();
      await user.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.queryByLabelText(`${title} preview`)).toBeNull()
      );
    }
  );

  it('opens on keyboard focus and dismisses when focus leaves', async () => {
    const user = userEvent.setup();
    render(
      <>
        <FeaturePreviewTooltip feature="bookmarks" />
        <button type="button">Outside</button>
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Preview Bookmarks' });
    await user.tab();
    expect(document.activeElement).toBe(trigger);
    await screen.findByLabelText('Bookmarks preview');
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Outside' })
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Bookmarks preview')).toBeNull()
    );
  });

  it('dismisses when the pointer leaves the info icon', async () => {
    const user = userEvent.setup();
    render(<FeaturePreviewTooltip feature="speed" />);
    const trigger = screen.getByRole('button', {
      name: 'Preview Playback Speed',
    });
    await user.hover(trigger);
    await screen.findByLabelText('Playback Speed preview');
    await user.unhover(trigger);
    await waitFor(() =>
      expect(screen.queryByLabelText('Playback Speed preview')).toBeNull()
    );
  });

  it.each([-1, 1])(
    'dismisses on a nested scroll in direction %s with a stationary pointer',
    async (direction) => {
      const user = userEvent.setup();
      render(
        <div data-testid="settings-scroll">
          <FeaturePreviewTooltip feature="cinema" />
        </div>
      );
      const trigger = screen.getByRole('button', {
        name: 'Preview Cinema Mode',
      });
      await user.hover(trigger);
      await screen.findByLabelText('Cinema Mode preview');
      const scroller = screen.getByTestId('settings-scroll');
      scroller.scrollTop = 100 + direction * 20;
      fireEvent.scroll(scroller);
      await waitFor(() =>
        expect(screen.queryByLabelText('Cinema Mode preview')).toBeNull()
      );
      await user.unhover(trigger);
      await user.hover(trigger);
      await screen.findByLabelText('Cinema Mode preview');
    }
  );

  it.each([-100, 100])(
    'dismisses on wheel %s even at a scroll boundary',
    async (deltaY) => {
      const user = userEvent.setup();
      render(<FeaturePreviewTooltip feature="cinema" />);
      const trigger = screen.getByRole('button', {
        name: 'Preview Cinema Mode',
      });
      await user.hover(trigger);
      await screen.findByLabelText('Cinema Mode preview');
      fireEvent.wheel(trigger, { deltaY });
      await waitFor(() =>
        expect(screen.queryByLabelText('Cinema Mode preview')).toBeNull()
      );
    }
  );

  it.each([-1, 1])(
    'opens the next info icon scrolled under a stationary pointer in direction %s',
    async (direction) => {
      const user = userEvent.setup();
      const previous = Object.getOwnPropertyDescriptor(
        document,
        'elementFromPoint'
      );
      const hitTest = vi.fn();
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: hitTest,
      });
      try {
        render(
          <div data-testid="settings-scroll">
            <FeaturePreviewTooltip feature="cinema" />
            <FeaturePreviewTooltip feature="boost" />
          </div>
        );
        const cinema = screen.getByRole('button', {
          name: 'Preview Cinema Mode',
        });
        const boost = screen.getByRole('button', {
          name: 'Preview Boost Volume',
        });
        const scroller = screen.getByTestId('settings-scroll');
        await user.hover(cinema);
        await screen.findByLabelText('Cinema Mode preview');
        fireEvent.wheel(scroller, {
          deltaY: direction * 100,
          clientX: 40,
          clientY: 60,
        });
        hitTest.mockReturnValue(null);
        fireEvent.scroll(scroller);
        await waitFor(() =>
          expect(screen.queryByLabelText('Cinema Mode preview')).toBeNull()
        );
        // Only the content moves; no pointer enter, leave, or move events follow.
        hitTest.mockReturnValue(boost.querySelector('svg'));
        fireEvent.scroll(scroller);
        await screen.findByLabelText('Boost Volume preview');
        expect(hitTest).toHaveBeenLastCalledWith(40, 60);
        expect(screen.queryByLabelText('Cinema Mode preview')).toBeNull();
        hitTest.mockReturnValue(null);
        fireEvent.scroll(scroller);
        await waitFor(() =>
          expect(screen.queryByLabelText('Boost Volume preview')).toBeNull()
        );
      } finally {
        if (previous)
          Object.defineProperty(document, 'elementFromPoint', previous);
        else Reflect.deleteProperty(document, 'elementFromPoint');
      }
    }
  );

  it('dismisses a keyboard preview on window scroll and reopens on fresh focus', async () => {
    const user = userEvent.setup();
    render(
      <>
        <FeaturePreviewTooltip feature="cinema" />
        <button type="button">Outside</button>
      </>
    );
    await user.tab();
    await screen.findByLabelText('Cinema Mode preview');
    fireEvent.scroll(window);
    await waitFor(() =>
      expect(screen.queryByLabelText('Cinema Mode preview')).toBeNull()
    );
    await user.tab();
    await user.tab({ shift: true });
    await screen.findByLabelText('Cinema Mode preview');
  });

  it('uses the selected thumbnail time mode in the preview', async () => {
    const user = userEvent.setup();
    render(
      <FeaturePreviewTooltip feature="thumbnails" thumbnailTimeDisplay="both" />
    );
    await user.hover(
      screen.getByRole('button', { name: 'Preview Hover Thumbnails' })
    );
    const popup = await screen.findByLabelText('Hover Thumbnails preview');
    expect(popup.querySelector('.mfs-thumbnail-time')?.textContent).toBe(
      '0:00 / −0:00'
    );
  });
});
