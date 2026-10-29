import { describe, expect, it } from 'vitest';
import type { SavedMoment } from './saved-media';
import { groupSavedMedia, savedMediaUrl } from './saved-media-groups';

const item: SavedMoment = {
  id: 'first',
  mediaKey: 'youtube:aqz-KE-bpKQ',
  url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=42s&list=playlist',
  title: 'Video',
  name: 'A moment',
  start: 42,
  createdAt: 100,
};

describe('saved video URL grouping', () => {
  it('combines timestamps, playlists, and embed links for the same YouTube video', () => {
    const loop = {
      ...item,
      id: 'second',
      url: 'https://www.youtube.com/embed/aqz-KE-bpKQ?start=60',
      title: 'Updated title',
      start: 60,
      end: 90,
      createdAt: 200,
    };
    const original = [item, loop];
    const groups = groupSavedMedia(original);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
      title: 'Updated title',
      items: original,
      newestAt: 200,
      oldestAt: 100,
    });
    expect(original).toEqual([item, loop]);
  });
  it('keeps distinct video IDs on the same domain in separate rows', () => {
    expect(
      groupSavedMedia([
        item,
        {
          ...item,
          id: 'second',
          mediaKey: 'youtube:M7lc1UVf-VE',
          url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        },
      ])
    ).toHaveLength(2);
  });
  it('groups generic moments by their page URL while keeping identifying query parameters', () => {
    const generic = {
      ...item,
      mediaKey: 'media:https://example.com/video.mp4',
      url: 'https://example.com/watch?id=1',
    };
    expect(
      groupSavedMedia([
        generic,
        {
          ...generic,
          id: 'second',
          mediaKey: 'media:https://example.com/other.mp4',
        },
      ])
    ).toHaveLength(1);
    expect(
      groupSavedMedia([
        generic,
        { ...generic, id: 'second', url: 'https://example.com/watch?id=2' },
      ])
    ).toHaveLength(2);
  });
  it('removes media timestamps and preserves hash-based page routes', () => {
    expect(
      savedMediaUrl({
        ...item,
        mediaKey: 'media:https://example.com/video.mp4',
        url: 'https://example.com/video.mp4#t=42,60',
      })
    ).toBe('https://example.com/video.mp4');
    expect(
      savedMediaUrl({
        ...item,
        mediaKey: 'media:https://example.com/video.mp4',
        url: 'https://example.com/#/watch/123',
      })
    ).toBe('https://example.com/#/watch/123');
  });
});
