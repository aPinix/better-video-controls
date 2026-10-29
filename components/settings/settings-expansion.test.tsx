// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsExpansion } from './settings-expansion';

afterEach(cleanup);

describe('SettingsExpansion', () => {
  it('mounts sub-options when opened and removes them after closing', async () => {
    const content = <button type="button">Sub-option</button>;
    const { rerender } = render(
      <SettingsExpansion open={false}>{content}</SettingsExpansion>
    );
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<SettingsExpansion open>{content}</SettingsExpansion>);
    const button = await screen.findByRole('button', { name: 'Sub-option' });
    const panel = button.closest('[data-slot="settings-expansion"]');
    expect(panel?.getAttribute('inert')).toBeNull();
    expect(panel?.getAttribute('aria-hidden')).toBeNull();
    rerender(<SettingsExpansion open={false}>{content}</SettingsExpansion>);
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
    await waitFor(() => expect(button.isConnected).toBe(false));
  });

  it('keeps errors readable when sub-options are collapsed', () => {
    render(
      <SettingsExpansion error="Could not save settings." open={false}>
        <button type="button">Sub-option</button>
      </SettingsExpansion>
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not save settings.'
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('retains a mounted panel when its expanded contents update', () => {
    const { rerender } = render(
      <SettingsExpansion open>
        <span>Initial details</span>
      </SettingsExpansion>
    );
    const panel = screen
      .getByText('Initial details')
      .closest('[data-slot="settings-expansion"]');
    rerender(
      <SettingsExpansion open>
        <span>Updated details</span>
        <button type="button">More options</button>
      </SettingsExpansion>
    );
    expect(
      screen
        .getByText('Updated details')
        .closest('[data-slot="settings-expansion"]')
    ).toBe(panel);
    expect(screen.getByRole('button', { name: 'More options' })).toBeTruthy();
  });
});
