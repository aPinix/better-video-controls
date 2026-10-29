import {
  BookmarkIcon,
  CheckIcon,
  DownloadIcon,
  PlayIcon,
  RepeatIcon,
} from 'lucide-react';
import { type RefObject, useRef } from 'react';
import {
  DEFAULT_PLAYER_TOOLS,
  type ScreenshotFormat,
} from '@/helpers/player-tools-settings';
import type { ThumbnailTimeDisplay } from '@/helpers/thumbnail-time';
import type { YouTubeControl } from '@/helpers/youtube-control-icons';
import { cn } from '@/lib/utils';
import { ExtraFeaturePreview } from './extra-feature-preview';
import { BookmarksPreview } from './bookmarks-preview';
import { BoostVolumePreview } from './boost-volume-preview';
import { AutoSkipPreview } from './auto-skip-preview';
import { PlaybackSpeedPreview } from './playback-speed-preview';
import { LoopSectionsPreview } from './loop-sections-preview';
import './mini-player-preview.css';
import './video-filters-preview.css';
import './screenshot-preview.css';
import './info-cards-preview.css';
import './cinema-preview.css';

export type FeaturePreviewId =
  | YouTubeControl
  | 'miniPlayer'
  | 'chapters'
  | 'library'
  | 'thumbnails'
  | 'speed'
  | 'autoSkip';

export const FEATURE_PREVIEW_DETAILS: Record<
  FeaturePreviewId,
  { title: string; description: string }
> = {
  boost: {
    title: 'Boost Volume',
    description:
      'Raise quiet videos above their original volume using the player’s boost control.',
  },
  cinema: {
    title: 'Cinema Mode',
    description:
      'Dim the page around the video. Choose the dimming level and color.',
  },
  loop: {
    title: 'Loop Sections',
    description:
      'Mark sections on the timeline and drag their handles to adjust what repeats.',
  },
  bookmarks: {
    title: 'Bookmarks',
    description:
      'Bookmark a moment. Hold the bookmark control to move or rename saves.',
  },
  infoCards: {
    title: 'End-screen cards',
    description:
      'Hide the recommendations that cover the end of a video. Show them again anytime.',
  },
  screenshot: {
    title: 'Screenshot',
    description:
      'Save the current video frame as JPEG or PNG, with or without your video filter effects.',
  },
  filters: {
    title: 'Video Filters',
    description:
      'Adjust brightness, contrast, and color without changing the original video.',
  },
  miniPlayer: {
    title: 'Mini Player',
    description:
      'Keep the video visible as you scroll. Drag to move or resize it.',
  },
  pip: {
    title: 'PiP Override',
    description:
      'Replace YouTube’s default Picture-in-Picture with the custom floating player.',
  },
  chapters: {
    title: 'Chaptered Timeline',
    description:
      'See chapter divisions on the timeline and chapter names as you hover.',
  },
  library: {
    title: 'Saved bookmarks & loops',
    description:
      'Browse saved videos, jump to bookmarks, and replay saved loops.',
  },
  thumbnails: {
    title: 'Hover Thumbnails',
    description: 'Hover over the timeline to preview a frame and its time.',
  },
  speed: {
    title: 'Playback Speed',
    description:
      'Start Instagram and TikTok videos at your preferred playback speed.',
  },
  autoSkip: {
    title: 'Auto-Skip',
    description:
      'Play the next Instagram or TikTok video when the current one ends.',
  },
};

function PreviewVideo({
  className,
  still = false,
  playbackRate = 1,
  videoRef,
}: {
  className?: string;
  still?: boolean;
  playbackRate?: number;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const playing =
    !still && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <video
      aria-hidden="true"
      autoPlay={playing}
      className={cn('absolute inset-0 size-full object-cover', className)}
      loop={playing}
      muted
      onLoadedMetadata={(event) => {
        event.currentTarget.playbackRate = playbackRate;
        if (!playing)
          event.currentTarget.currentTime = Math.min(
            3.45,
            event.currentTarget.duration / 2
          );
      }}
      playsInline
      preload="metadata"
      ref={videoRef}
      src="/video/video-preview.mp4"
      tabIndex={-1}
    />
  );
}

function ScreenshotPreview({ format }: { format: ScreenshotFormat }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapshotRef = useRef<HTMLCanvasElement>(null);
  const capture = () => {
    const video = videoRef.current;
    const canvas = snapshotRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
  };
  return (
    <>
      <PreviewVideo videoRef={videoRef} />
      <div
        className="screenshot-preview-flash absolute inset-0 bg-white"
        onAnimationStart={capture}
        onAnimationIteration={capture}
      />
      <div className="screenshot-preview-frame absolute inset-4 overflow-hidden rounded-md border-2 border-white shadow-lg">
        <canvas className="size-full object-cover" ref={snapshotRef} />
      </div>
      <span className="screenshot-preview-saved absolute right-5 bottom-5 flex items-center gap-1 rounded bg-black/80 px-2 py-1 text-[9px]">
        <DownloadIcon className="size-3" />
        {format.toUpperCase()}
        <CheckIcon className="size-3 text-lime-300" />
      </span>
    </>
  );
}

function MiniPlayerPreview() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-950">
      <div className="mini-player-preview-page absolute inset-x-3 top-3">
        <div className="relative h-22.5 w-40 overflow-hidden rounded-sm bg-black">
          <PreviewVideo />
          <div className="absolute inset-x-1 bottom-1 h-0.5 bg-white/30">
            <div className="h-full w-2/3 bg-red-500" />
          </div>
        </div>
        <div className="mt-2 h-1.5 w-32 rounded-full bg-slate-500" />
        <div className="mt-2 h-1 w-24 rounded-full bg-slate-700" />
        <div className="mt-4 rounded bg-slate-800/60 p-2">
          <div className="h-1 w-28 rounded-full bg-slate-600" />
          <div className="mt-2 h-1 w-36 rounded-full bg-slate-700" />
          <div className="mt-2 h-1 w-24 rounded-full bg-slate-700" />
        </div>
        {[0, 1, 2].map((row) => (
          <div className="mt-4 flex items-start gap-2" key={row}>
            <div className="size-4 rounded-full bg-slate-700" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-1 w-24 rounded-full bg-slate-600" />
              <div className="h-1 w-36 rounded-full bg-slate-800" />
            </div>
          </div>
        ))}
        <div className="absolute top-0 right-0 space-y-2">
          {[0, 1, 2].map((row) => (
            <div className="h-7 w-10 rounded bg-slate-800" key={row} />
          ))}
        </div>
      </div>
      <div className="absolute inset-y-2 right-1 w-0.5 rounded-full bg-slate-800">
        <div className="mini-player-preview-scrollbar h-7 rounded-full bg-slate-500" />
      </div>
      <div className="mini-player-preview-floating absolute top-3 left-3 aspect-video w-26 overflow-hidden rounded-md border border-white/30 bg-black shadow-xl">
        <PreviewVideo />
      </div>
    </div>
  );
}

function FloatingPlayerPreview() {
  return (
    <div className="absolute inset-0 bg-slate-950 p-3">
      <div className="h-1.5 w-20 rounded-full bg-slate-600" />
      <div className="mt-3 h-10 w-30 rounded bg-slate-800" />
      <div className="mt-3 h-1 w-36 rounded-full bg-slate-700" />
      <div className="mt-2 h-1 w-28 rounded-full bg-slate-800" />
      <div className="absolute inset-y-3 right-2 w-0.5 rounded-full bg-slate-700" />
      <div className="absolute right-5 bottom-3 h-18 w-32 overflow-hidden rounded-lg border border-white/30 bg-black shadow-xl">
        <PreviewVideo />
        <div className="absolute inset-x-0 top-0 bg-black/70 px-2 py-1 text-[8px]">
          Picture-in-Picture
        </div>
        <div className="absolute right-1 bottom-1 size-2 border-r-2 border-b-2 border-white" />
      </div>
    </div>
  );
}

export function FeaturePreview({
  feature,
  thumbnailTimeDisplay,
  screenshotFormat = 'jpeg',
  boostLevel,
}: {
  feature: FeaturePreviewId;
  thumbnailTimeDisplay?: ThumbnailTimeDisplay;
  screenshotFormat?: ScreenshotFormat;
  boostLevel?: number;
}) {
  if (feature === 'loop') return <LoopSectionsPreview />;
  if (feature === 'bookmarks') return <BookmarksPreview />;
  if (feature === 'thumbnails' || feature === 'chapters') {
    return (
      <ExtraFeaturePreview
        featureName={
          feature === 'thumbnails' ? 'Hover Thumbnails' : 'Chaptered Timeline'
        }
        thumbnailTimeDisplay={thumbnailTimeDisplay}
      />
    );
  }
  return (
    <div
      aria-description={
        feature === 'infoCards'
          ? 'End-screen recommendations alternate between visible and hidden while the video keeps playing.'
          : undefined
      }
      aria-label={`${FEATURE_PREVIEW_DETAILS[feature].title} feature preview`}
      className="relative h-33.75 w-60 overflow-hidden bg-slate-950 text-white"
      role="img"
    >
      <div aria-hidden="true" className="absolute inset-0">
        {![
          'cinema',
          'miniPlayer',
          'pip',
          'library',
          'autoSkip',
          'screenshot',
          'speed',
        ].includes(feature) && (
          <>
            <PreviewVideo
              className={
                feature === 'filters'
                  ? 'video-filters-preview-video'
                  : undefined
              }
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/10" />
          </>
        )}
        {feature === 'boost' && (
          <BoostVolumePreview key={boostLevel} level={boostLevel} />
        )}
        {feature === 'cinema' && (
          <div className="absolute inset-0 bg-slate-700">
            <div className="absolute top-2 left-3 h-1.5 w-6 rounded-full bg-red-500" />
            <div className="absolute top-2 left-12 h-1.5 w-28 rounded-full bg-slate-500" />
            <div className="absolute top-6 right-3 space-y-2">
              {[0, 1, 2].map((row) => (
                <div className="space-y-1" key={row}>
                  <div className="h-5 w-10 rounded bg-slate-500" />
                  <div className="h-1 w-8 rounded-full bg-slate-400" />
                </div>
              ))}
            </div>
            <div className="absolute bottom-2 left-3 h-1 w-20 rounded-full bg-slate-400" />
            <div
              className="cinema-preview-shade absolute inset-0"
              style={{
                backgroundColor: `rgb(0 0 0 / ${DEFAULT_PLAYER_TOOLS.dimming / 100})`,
              }}
            />
            <div className="absolute top-6 left-3 aspect-video w-40 overflow-hidden rounded-sm">
              <PreviewVideo />
            </div>
            <span className="cinema-preview-off absolute right-3 bottom-1 rounded-full bg-black/80 px-2 py-1 text-[8px]">
              Cinema mode off
            </span>
            <span className="cinema-preview-on absolute right-3 bottom-1 rounded-full bg-black/80 px-2 py-1 text-[8px]">
              Cinema mode on
            </span>
          </div>
        )}
        {feature === 'infoCards' && (
          <>
            <div className="absolute inset-x-3 top-1/2 -translate-y-1/2">
              <div className="info-cards-preview-recommendations grid grid-cols-2 gap-2">
                {['Up next', 'Recommended'].map((title, index) => (
                  <div
                    className="relative aspect-video overflow-hidden rounded border border-white/50 bg-slate-900 shadow-md"
                    key={title}
                  >
                    <PreviewVideo
                      still
                      className={index === 1 ? 'scale-125' : undefined}
                    />
                    <PlayIcon className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 fill-white/80 text-white drop-shadow" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1.5 py-0.5 text-[7px]">
                      {title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span className="info-cards-preview-visible absolute bottom-2 left-3 rounded bg-black/75 px-2 py-1 text-[9px]">
              Recommendations visible
            </span>
            <span className="info-cards-preview-hidden absolute bottom-2 left-3 rounded bg-black/75 px-2 py-1 text-[9px]">
              Recommendations hidden
            </span>
          </>
        )}
        {feature === 'screenshot' && (
          <ScreenshotPreview format={screenshotFormat} />
        )}
        {feature === 'filters' && (
          <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-3 rounded-lg bg-black/75 px-3 py-2 text-[8px] backdrop-blur-sm">
            {[
              ['brightness', 'Brightness'],
              ['contrast', 'Contrast'],
              ['color', 'Color'],
            ].map(([filter, label]) => (
              <div className="space-y-1.5" key={filter}>
                <span>{label}</span>
                <div className="h-0.5 overflow-hidden rounded-full bg-white/25">
                  <div
                    className={`video-filters-preview-${filter} h-full origin-left rounded-full bg-violet-300`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {feature === 'miniPlayer' && <MiniPlayerPreview />}
        {feature === 'pip' && <FloatingPlayerPreview />}
        {feature === 'library' && (
          <div className="absolute inset-0 space-y-2 bg-slate-950 p-3">
            <div className="mb-3 text-[10px] font-semibold text-slate-300">
              Saved bookmarks & loops
            </div>
            {[
              {
                icon: BookmarkIcon,
                name: 'Mountain pass',
                time: '0:42',
                color: 'text-sky-300',
              },
              {
                icon: RepeatIcon,
                name: 'Favorite section',
                time: '1:00–1:30',
                color: 'text-yellow-300',
              },
            ].map(({ icon: Icon, name, time, color }) => (
              <div
                className="flex items-center gap-2 rounded-lg bg-slate-800 px-2 py-2"
                key={name}
              >
                <Icon className={cn('size-4', color)} />
                <span className="flex-1 text-[9px]">{name}</span>
                <span className="text-[8px] text-slate-400">{time}</span>
              </div>
            ))}
          </div>
        )}
        {feature === 'speed' && <PlaybackSpeedPreview />}
        {feature === 'autoSkip' && <AutoSkipPreview />}
      </div>
    </div>
  );
}
