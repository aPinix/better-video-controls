// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { useYouTubeLibraryPage } from './use-youtube-library-page';

function Preferences() {
  const [draft, setDraft] = useState('');
  return (
    <input
      aria-label="Preference draft"
      onChange={(event) => setDraft(event.target.value)}
      value={draft}
    />
  );
}

function Fixture({ active = true }: { active?: boolean }) {
  const page = useYouTubeLibraryPage(active);
  return (
    <>
      <button onClick={page.leave} type="button">
        Settings tab
      </button>
      <div data-testid="surface" ref={page.surfaceRef}>
        <div
          hidden={page.isOpen}
          inert={page.isOpen}
          ref={page.preferencesScrollRef}
        >
          <div
            data-slot="scroll-area-viewport"
            data-testid="preferences-viewport"
          >
            <Preferences />
            <div ref={page.entryRef}>
              <button
                onClick={(event) => page.open(event.detail > 0)}
                type="button"
              >
                Saved bookmarks &amp; loops
              </button>
            </div>
          </div>
        </div>
        {page.isOpen && (
          <div data-testid="youtube-saved-library">
            <h1>Saved bookmarks &amp; loops</h1>
            <button
              onClick={(event) => page.back(event.detail > 0)}
              type="button"
            >
              YouTube settings
            </button>
          </div>
        )}
      </div>
      <output>{page.searchActivation}</output>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('keeps preferences mounted and restores the entry’s scroll position and focus on Back', () => {
  render(<Fixture />);
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Unchanged preference' },
  });
  const viewport = screen.getByTestId('preferences-viewport');
  viewport.scrollTop = 720;
  const entry = screen.getByRole('button', { name: 'Saved bookmarks & loops' });
  fireEvent.click(entry);
  expect(screen.getByTestId('youtube-saved-library')).toBeTruthy();
  expect(document.activeElement?.tagName).toBe('H1');
  expect(screen.queryByRole('textbox')).toBeNull();
  viewport.scrollTop = 0;
  fireEvent.click(screen.getByRole('button', { name: 'YouTube settings' }));
  expect(viewport.scrollTop).toBe(720);
  expect(document.activeElement).toBe(entry);
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe(
    'Unchanged preference'
  );
  expect(screen.getByRole('status').textContent).toBe('preserve');
});

it('closes the nested page on either primary-tab selection or swipe departure', () => {
  const { rerender } = render(<Fixture />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved bookmarks & loops' })
  );
  fireEvent.click(screen.getByRole('button', { name: 'Settings tab' }));
  expect(screen.queryByTestId('youtube-saved-library')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved bookmarks & loops' })
  );
  rerender(<Fixture active={false} />);
  expect(screen.queryByTestId('youtube-saved-library')).toBeNull();
  rerender(<Fixture />);
  expect(document.activeElement?.textContent).toBe('Saved bookmarks & loops');
});

it('cancels an in-flight carousel opening when Settings is selected', () => {
  render(<Fixture />);
  const surface = screen.getByTestId('surface');
  Object.defineProperty(surface, 'clientWidth', { value: 400 });
  surface.scrollTo = vi.fn();
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved bookmarks & loops' }),
    { detail: 1 }
  );
  expect(surface.scrollTo).toHaveBeenCalledWith({
    left: 400,
    behavior: 'smooth',
  });
  expect(surface.dataset.navigation).toBe('forward');
  fireEvent.click(screen.getByRole('button', { name: 'Settings tab' }));
  fireEvent(surface, new Event('scrollend'));
  expect(surface.dataset.navigation).toBeUndefined();
  expect(screen.queryByTestId('youtube-saved-library')).toBeNull();
});

it('does not steal focus from a library control when a duplicate scroll-end event arrives', () => {
  render(<Fixture />);
  const surface = screen.getByTestId('surface');
  Object.defineProperty(surface, 'clientWidth', { value: 400 });
  surface.scrollTo = vi.fn();
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved bookmarks & loops' }),
    { detail: 1 }
  );
  surface.scrollLeft = 400;
  fireEvent(surface, new Event('scrollend'));
  const back = screen.getByRole('button', { name: 'YouTube settings' });
  back.focus();
  fireEvent(surface, new Event('scrollend'));
  expect(document.activeElement).toBe(back);
});

it('lets a horizontal gesture take over an opening carousel without leaving the preferences inert', () => {
  render(<Fixture />);
  const surface = screen.getByTestId('surface');
  Object.defineProperty(surface, 'clientWidth', { value: 400 });
  surface.scrollTo = vi.fn();
  fireEvent.click(
    screen.getByRole('button', { name: 'Saved bookmarks & loops' }),
    { detail: 1 }
  );
  surface.scrollLeft = 240;
  const gesture = new WheelEvent('wheel', {
    deltaX: -40,
    bubbles: true,
    cancelable: true,
  });
  fireEvent(surface, gesture);
  expect(gesture.defaultPrevented).toBe(false);
  expect(surface.scrollLeft).toBe(240);
  expect(surface.scrollTo).toHaveBeenCalledTimes(1);
  expect(surface.dataset.navigation).toBeUndefined();
  expect(screen.getByTestId('youtube-saved-library')).toBeTruthy();
  surface.scrollLeft = 0;
  fireEvent(surface, new Event('scrollend'));
  expect(screen.queryByTestId('youtube-saved-library')).toBeNull();
  expect(document.activeElement?.textContent).toBe('Saved bookmarks & loops');
});
