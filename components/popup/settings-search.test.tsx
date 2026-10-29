// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { SettingsSearch } from './settings-search';

function Fixture({
  active = true,
  activationMode = 'focus',
}: {
  active?: boolean;
  activationMode?: 'focus' | 'preserve';
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <button type="button">Saved bookmarks &amp; loops</button>
      <div ref={contentRef}>
        <div className="card-list-item">Loop Sections</div>
        <div className="card-list-item">Remember loop sections</div>
        <div className="card-list-item">Volume</div>
      </div>
      <SettingsSearch
        activationMode={activationMode}
        active={active}
        contentRef={contentRef}
      />
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('highlights matches, scrolls to the first, and clears the search', async () => {
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  render(<Fixture />);
  const input = screen.getByRole('searchbox', { name: 'Search settings' });
  expect(document.activeElement).toBe(input);
  fireEvent.change(input, { target: { value: 'LOOP' } });
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe('2 found')
  );
  expect(
    screen.getByText('Loop Sections').hasAttribute('data-search-match')
  ).toBe(true);
  expect(screen.getByText('Volume').hasAttribute('data-search-match')).toBe(
    false
  );
  expect(scroll).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(input);
  fireEvent.click(
    screen.getByRole('button', { name: 'Clear settings search' })
  );
  await waitFor(() =>
    expect(document.querySelector('[data-search-match]')).toBeNull()
  );
});
it('reports no matches without scrolling', async () => {
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  render(<Fixture />);
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'not found' },
  });
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe('No matches')
  );
  expect(scroll).not.toHaveBeenCalled();
});
it('preserves entry focus and scroll when reactivated, while letting a new search scroll', async () => {
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  const { rerender } = render(<Fixture />);
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'loop' },
  });
  await waitFor(() => expect(scroll).toHaveBeenCalledOnce());
  rerender(<Fixture active={false} />);
  screen.getByRole('button', { name: 'Saved bookmarks & loops' }).focus();
  rerender(<Fixture activationMode="preserve" />);
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe('2 found')
  );
  expect(document.activeElement?.textContent).toBe('Saved bookmarks & loops');
  expect(scroll).toHaveBeenCalledOnce();
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(
    'loop'
  );
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'volume' },
  });
  await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
});
