// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArrowDownAZIcon, ArrowUpAZIcon, ListRestartIcon } from 'lucide-react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppSortPicker } from './app-sort-picker';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.style.removeProperty('font-size');
});

const options = [
  {
    icon: ArrowDownAZIcon,
    label: 'Website ascending',
    value: 'website-ascending',
  },
  {
    icon: ArrowUpAZIcon,
    label: 'Website descending',
    value: 'website-descending',
  },
  { icon: ListRestartIcon, label: 'Custom', value: 'custom' },
] as const;

function SortPickerHarness({
  placement = 'selected',
}: {
  placement?: 'selected' | 'below' | 'auto';
}) {
  const [value, setValue] =
    useState<(typeof options)[number]['value']>('website-ascending');

  return (
    <AppSortPicker
      label="Sort domains"
      onValueChange={setValue}
      options={options}
      placement={placement}
      value={value}
    />
  );
}

describe('AppSortPicker', () => {
  it('opens below near the top and flips above when scrolling or resizing', async () => {
    const user = userEvent.setup();
    document.documentElement.style.fontSize = '16px';
    render(<SortPickerHarness placement="auto" />);
    const picker = screen.getByRole('group', { name: 'Sort domains' });
    const pill = picker.querySelector<HTMLElement>(
      '[data-slot="app-sort-picker-pill"]'
    );
    const rect = vi.spyOn(picker, 'getBoundingClientRect');
    rect.mockReturnValue(new DOMRect(0, 16, 28, 28));

    await user.click(
      screen.getByRole('button', {
        name: 'Sort domains: Website ascending',
      })
    );
    expect(pill?.style.top).toBe('0rem');
    expect(screen.getByRole('button', { name: 'Custom' }).style.transform).toBe(
      'translateY(4rem) scale(1)'
    );

    rect.mockReturnValue(new DOMRect(0, window.innerHeight - 44, 28, 28));
    fireEvent.scroll(picker.parentElement as HTMLElement);
    expect(pill?.style.top).toBe('-4rem');
    expect(screen.getByRole('button', { name: 'Custom' }).style.transform).toBe(
      'translateY(-4rem) scale(1)'
    );

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    await user.click(
      screen.getByRole('button', { name: 'Sort domains: Custom' })
    );
    expect(pill?.style.top).toBe('-4rem');
    expect(
      screen.getByRole('button', { name: 'Website ascending' }).style.transform
    ).toBe('translateY(-2rem) scale(1)');

    rect.mockReturnValue(new DOMRect(0, 16, 28, 28));
    fireEvent.resize(window);
    expect(pill?.style.top).toBe('0rem');
    expect(
      screen.getByRole('button', { name: 'Website ascending' }).style.transform
    ).toBe('translateY(2rem) scale(1)');
  });

  it('uses the scroll viewport and leaves room for fixed header and footer controls', async () => {
    const user = userEvent.setup();
    document.documentElement.style.fontSize = '20px';
    render(
      <div data-slot="scroll-area-viewport" data-testid="viewport">
        <AppSortPicker
          collisionPadding={{ top: 88, bottom: 128 }}
          label="Sort domains"
          onValueChange={vi.fn()}
          options={options}
          placement="auto"
          value="custom"
        />
      </div>
    );
    const picker = screen.getByRole('group', { name: 'Sort domains' });
    const viewport = screen.getByTestId('viewport');
    const rect = vi.spyOn(picker, 'getBoundingClientRect');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 600)
    );
    rect.mockReturnValue(new DOMRect(0, 400, 35, 35));

    await user.click(
      screen.getByRole('button', { name: 'Sort domains: Custom' })
    );
    const pill = picker.querySelector<HTMLElement>(
      '[data-slot="app-sort-picker-pill"]'
    );
    expect(pill?.style.top).toBe('-4rem');

    rect.mockReturnValue(new DOMRect(0, 100, 35, 35));
    fireEvent.scroll(viewport);
    expect(pill?.style.top).toBe('0rem');
  });

  it('keeps the selected icon anchored while expanding and contracts to a new choice', async () => {
    const user = userEvent.setup();
    render(<SortPickerHarness />);

    const picker = screen.getByRole('group', { name: 'Sort domains' });
    const pill = picker.querySelector<HTMLElement>(
      '[data-slot="app-sort-picker-pill"]'
    );
    const selected = screen.getByRole('button', {
      name: 'Sort domains: Website ascending',
    });

    expect(picker.classList).toContain('h-7');
    expect(picker.classList).toContain('w-7');
    expect(pill?.style.height).toBe('1.75rem');
    expect(pill?.style.top).toBe('0rem');
    expect(selected.querySelector('svg')?.classList).toContain(
      'lucide-arrow-down-a-z'
    );
    expect(selected.classList).toContain('cursor-pointer');

    await user.click(selected);

    expect(pill?.style.height).toBe('5.75rem');
    expect(pill?.classList).toContain('bg-white/80');
    expect(pill?.classList).toContain('dark:bg-slate-800/80');
    expect(pill?.style.backdropFilter).toBe('saturate(180%) blur(20px)');
    expect(picker.classList).toContain('z-40');
    expect(selected.getAttribute('aria-expanded')).toBe('true');
    const custom = screen.getByRole('button', { name: 'Custom' });
    expect(custom.classList).toContain('cursor-pointer');
    expect(custom.style.transform).toBe('translateY(4rem) scale(1)');
    await user.hover(custom);
    expect(await screen.findByText('Custom')).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Website descending' })
    );

    expect(pill?.style.height).toBe('1.75rem');
    expect(pill?.style.backdropFilter).toBe('none');
    expect(picker.classList).not.toContain('z-40');
    expect(
      screen
        .getByRole('button', {
          name: 'Sort domains: Website descending',
        })
        .querySelector('svg')?.classList
    ).toContain('lucide-arrow-up-a-z');

    await user.click(
      screen.getByRole('button', {
        name: 'Sort domains: Website descending',
      })
    );
    expect(pill?.style.top).toBe('-2rem');
    expect(
      screen.getByRole('button', { name: 'Website ascending' }).style.transform
    ).toBe('translateY(-2rem) scale(1)');

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    await user.click(
      screen.getByRole('button', { name: 'Sort domains: Custom' })
    );

    expect(pill?.style.top).toBe('-4rem');
    expect(
      screen.getByRole('button', { name: 'Website ascending' }).style.transform
    ).toBe('translateY(-4rem) scale(1)');
    expect(
      screen.getByRole('button', { name: 'Website descending' }).style.transform
    ).toBe('translateY(-2rem) scale(1)');
  });
});
