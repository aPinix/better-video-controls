// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  extractDescriptionChapters,
  extractYouTubeChapterModel,
} from './youtube-chapters';

describe('description chapters', () => {
  it('sorts and deduplicates timestamps without inventing an introductory chapter', () => {
    expect(
      extractDescriptionChapters(
        '1:00 Second section\n0:10 - First section\n1:00 Duplicate\n3:00 Outside\n1:90 Invalid',
        120
      )
    ).toEqual({
      source: 'description',
      chapters: [
        { start: 10, end: 60, title: 'First section' },
        { start: 60, end: 120, title: 'Second section' },
      ],
    });
  });
  it('requires two titled sections and a finite duration', () => {
    expect(extractDescriptionChapters('0:00\n1:00', 120)).toBeNull();
    expect(extractDescriptionChapters('0:00 Intro', 120)).toBeNull();
    expect(
      extractDescriptionChapters('0:00 Intro\n1:00 More', Infinity)
    ).toBeNull();
  });
  it.each([
    '0:00 Intro\n0:30 More',
    '0:00 Intro<br>0:30 More',
    '<div>0:00 Intro</div><div>0:30 More</div>',
    '<p>0:00 Intro</p><p>0:30 More</p>',
  ])(
    'only extracts description chapters when enabled and ignores ads: %s',
    (content) => {
      document.body.innerHTML = `<ytd-watch-flexy video-id="abc"><div id="movie_player"><video></video></div><ytd-watch-metadata><div id="description">${content}</div></ytd-watch-metadata></ytd-watch-flexy>`;
      const video = document.querySelector('video') as HTMLVideoElement;
      Object.defineProperty(video, 'duration', { value: 60 });
      const args = {
        ownerDocument: document,
        pageUrl: 'https://www.youtube.com/watch?v=abc',
        video,
      };
      expect(extractYouTubeChapterModel(args)).toBeNull();
      const player = document.querySelector<HTMLElement>(
        '#movie_player'
      ) as HTMLElement;
      player.dataset.mfsAutoChapters = 'true';
      expect(extractYouTubeChapterModel(args)).toEqual({
        source: 'description',
        chapters: [
          { start: 0, end: 30, title: 'Intro' },
          { start: 30, end: 60, title: 'More' },
        ],
      });
      expect(document.querySelector('#description')?.innerHTML).toBe(content);
      player.className = 'ad-showing';
      expect(extractYouTubeChapterModel(args)).toBeNull();
    }
  );
});
