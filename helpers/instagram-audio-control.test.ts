// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupInstagramAudioControl } from './instagram-audio-control';

afterEach(() => document.body.replaceChildren());

describe('Instagram native audio control', () => {
  it('waits for an asynchronous native icon update instead of toggling twice', async () => {
    const player = document.createElement('div');
    const video = document.createElement('video');
    const button = document.createElement('button');
    button.innerHTML = '<svg aria-label="Audio is muted"></svg>';
    player.append(video, button);
    document.body.append(player);
    const click = vi.fn();
    button.addEventListener('click', click);
    const controller = setupInstagramAudioControl(video, () =>
      controller.sync(false)
    );
    try {
      controller.sync(false);
      controller.sync(false);
      expect(click).toHaveBeenCalledOnce();
      button
        .querySelector('svg')!
        .setAttribute('aria-label', 'Audio is playing');
      await Promise.resolve();
      expect(click).toHaveBeenCalledOnce();
      controller.sync(true);
      expect(click).toHaveBeenCalledTimes(2);
    } finally {
      controller.cleanup();
    }
  });
  it('does not click a sibling video’s button or a player-sized play button', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.innerHTML = '<video></video>';
    second.innerHTML =
      '<video></video><button><svg aria-label="Audio is muted"></svg></button>';
    document.body.append(first, second);
    const siblingClick = vi.fn();
    second.querySelector('button')!.addEventListener('click', siblingClick);
    const controller = setupInstagramAudioControl(
      first.querySelector('video')!,
      () => {}
    );
    try {
      controller.sync(false);
      expect(siblingClick).not.toHaveBeenCalled();
    } finally {
      controller.cleanup();
    }
    first.setAttribute('role', 'button');
    first.insertAdjacentHTML(
      'beforeend',
      '<svg aria-label="Audio is muted"></svg>'
    );
    const playerClick = vi.fn();
    first.addEventListener('click', playerClick);
    const next = setupInstagramAudioControl(
      first.querySelector('video')!,
      () => {}
    );
    try {
      next.sync(false);
      expect(playerClick).not.toHaveBeenCalled();
    } finally {
      next.cleanup();
    }
  });
});
