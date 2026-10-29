// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHoldToDelete } from './app-hold-to-delete';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (milliseconds: number) => {
  act(() => vi.advanceTimersByTime(milliseconds));
};

function setup(disabled = false) {
  const onDelete = vi.fn();
  const view = render(
    <AppHoldToDelete
      disabled={disabled}
      label="Delete bookmark"
      onDelete={onDelete}
    />
  );
  const button = screen.getByRole('button', { name: 'Delete bookmark' });
  return { ...view, button, onDelete };
}

function pointer(button: HTMLElement, type: string, buttonNumber = 0) {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: buttonNumber,
    relatedTarget: document.body,
  });
  Object.assign(event, { pointerId: 1, isPrimary: true });
  fireEvent(button, event);
}

describe('AppHoldToDelete', () => {
  it('ignores clicks and deletes exactly once after a continuous two-second pointer hold', () => {
    const { button, onDelete } = setup();
    expect(button.textContent).toBe('');
    expect(button.classList).toContain('rounded-full');
    expect(button.getAttribute('title')).toContain('2 seconds');
    pointer(button, 'pointerdown');
    pointer(button, 'pointerup');
    fireEvent.click(button);
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();

    pointer(button, 'pointerdown');
    expect(button.hasAttribute('data-holding')).toBe(true);
    advance(1999);
    expect(onDelete).not.toHaveBeenCalled();
    advance(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    advance(4000);
    expect(onDelete).toHaveBeenCalledTimes(1);
    pointer(button, 'pointerup');
    expect(button.hasAttribute('data-holding')).toBe(false);
  });

  it('resets the full delay after an early release', () => {
    const { button, onDelete } = setup();
    pointer(button, 'pointerdown');
    advance(1500);
    pointer(button, 'pointerup');
    expect(button.hasAttribute('data-holding')).toBe(false);
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();

    pointer(button, 'pointerdown');
    advance(1999);
    expect(onDelete).not.toHaveBeenCalled();
    advance(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerout', 'pointercancel', 'lostpointercapture'])(
    'cancels when the active pointer receives %s',
    (type) => {
      const { button, onDelete } = setup();
      pointer(button, 'pointerdown');
      advance(1000);
      pointer(button, type);
      advance(3000);
      expect(onDelete).not.toHaveBeenCalled();
      expect(button.hasAttribute('data-holding')).toBe(false);
    }
  );

  it.each([' ', 'Enter'] as const)(
    'requires a full hold for the %j key and ignores key repeats',
    (key) => {
      const { button, onDelete } = setup();
      fireEvent.keyDown(button, { key });
      advance(1000);
      fireEvent.keyUp(button, { key });
      advance(3000);
      expect(onDelete).not.toHaveBeenCalled();

      fireEvent.keyDown(button, { key });
      advance(1000);
      fireEvent.keyDown(button, { key, repeat: true });
      advance(999);
      expect(onDelete).not.toHaveBeenCalled();
      advance(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
      fireEvent.keyDown(button, { key, repeat: true });
      advance(3000);
      expect(onDelete).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['escape', 'blur', 'window blur', 'scroll', 'visibility change'])(
    'cancels on %s',
    (reason) => {
      const { button, onDelete } = setup();
      fireEvent.keyDown(button, { key: ' ' });
      advance(1000);
      if (reason === 'escape') fireEvent.keyDown(button, { key: 'Escape' });
      if (reason === 'blur') fireEvent.blur(button);
      if (reason === 'window blur') fireEvent.blur(window);
      if (reason === 'scroll')
        fireEvent.scroll(button.parentElement as HTMLElement);
      if (reason === 'visibility change')
        fireEvent(document, new Event('visibilitychange'));
      advance(3000);
      expect(onDelete).not.toHaveBeenCalled();
      expect(button.hasAttribute('data-holding')).toBe(false);
    }
  );

  it('cancels when disabled or unmounted', () => {
    const { button, onDelete, rerender, unmount } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    advance(1000);
    rerender(
      <AppHoldToDelete disabled label="Delete bookmark" onDelete={onDelete} />
    );
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();
    rerender(<AppHoldToDelete label="Delete bookmark" onDelete={onDelete} />);
    fireEvent.keyDown(button, { key: ' ' });
    unmount();
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does not delete after the containing view becomes inactive', () => {
    const { button, onDelete } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    button.parentElement?.setAttribute('inert', '');
    advance(2000);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('ignores disabled buttons and secondary mouse buttons', () => {
    const { button, onDelete, rerender } = setup(true);
    pointer(button, 'pointerdown');
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();
    pointer(button, 'pointerup');
    rerender(<AppHoldToDelete label="Delete bookmark" onDelete={onDelete} />);
    pointer(button, 'pointerdown', 2);
    advance(3000);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
