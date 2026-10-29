// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createYouTubePipReturnArea } from './youtube-pip-return';

afterEach(() => document.body.replaceChildren());
it('returns directly through the placeholder without forwarding a click to the player', () => {
  const returned = vi.fn();
  const playerClick = vi.fn();
  const player = document.createElement('div');
  player.addEventListener('click', playerClick);
  document.body.append(player);
  const { area, button } = createYouTubePipReturnArea(document, returned);
  player.append(area);
  button.click();
  expect(returned).toHaveBeenCalledOnce();
  expect(playerClick).not.toHaveBeenCalled();
  expect(button.getAttribute('aria-label')).toBe(
    'Bring video back to this page'
  );
});
