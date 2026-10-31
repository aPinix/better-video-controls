import {
  HeartIcon,
  MaximizeIcon,
  MessageCircleIcon,
  PauseIcon,
  SettingsIcon,
  Share2Icon,
  Volume2Icon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { MEDIA_OVERLAY_STYLES } from '@/helpers/media-overlay-styles';
import {
  getColorizedTimelineBackground,
  TIMELINE_PROGRESS_STYLE,
  TIMELINE_TRACK_STYLE,
} from '@/helpers/timeline-appearance';
import { VOLUME_ICON_PATHS } from '@/helpers/volume-icon';
import { SITE_COLOR_EXAMPLES } from './site-color-preview';
import './minimal-player-preview.css';

const MINIMAL_PLAYER_EXAMPLES = [
  ...SITE_COLOR_EXAMPLES,
  { name: 'Other sites', color: '#94a3b8' },
] as const;

export function MinimalPlayerPreview({
  colorizedTimeline = false,
}: {
  colorizedTimeline?: boolean;
}) {
  const [siteIndex, setSiteIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(
      () =>
        setSiteIndex((index) => (index + 1) % MINIMAL_PLAYER_EXAMPLES.length),
      4000
    );
    return () => clearInterval(timer);
  }, [reducedMotion]);
  const site = MINIMAL_PLAYER_EXAMPLES[siteIndex] ?? MINIMAL_PLAYER_EXAMPLES[0];
  const portrait = site.name === 'Instagram' || site.name === 'TikTok';

  return (
    <div
      aria-description="Compare the site's original controls on the left with the uncluttered Minimal Player on the right. Examples cycle through YouTube, Vimeo, Instagram, TikTok, and other sites."
      aria-label="Minimal Player feature preview"
      className="relative h-33.75 w-60 overflow-hidden bg-slate-950 text-white"
      role="img"
    >
      <style>{MEDIA_OVERLAY_STYLES}</style>
      <div aria-hidden="true" className="absolute inset-0">
        <div className="flex h-6 items-center justify-center gap-1.5 text-[10px] font-medium">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: site.color }}
          />
          <span>{site.name}</span>
          <div className="ml-1 flex gap-1">
            {MINIMAL_PLAYER_EXAMPLES.map((example, index) => (
              <span
                className="size-1 rounded-full"
                key={example.name}
                style={{
                  backgroundColor:
                    index === siteIndex ? site.color : '#ffffff40',
                }}
              />
            ))}
          </div>
        </div>
        <div
          className="minimal-player-site-scene grid grid-cols-2 divide-x divide-white/15"
          key={site.name}
        >
          {[false, true].map((minimal) => (
            <div className="flex flex-col items-center" key={String(minimal)}>
              <span className="text-[8px] text-white/80">
                Minimal Player {minimal ? 'on' : 'off'}
              </span>
              <div className="flex h-23 w-full items-center justify-center">
                <div
                  className={`relative overflow-hidden rounded border border-white/20 bg-black ${portrait ? 'h-21 w-12' : 'aspect-video w-27'}`}
                >
                  <video
                    autoPlay={!reducedMotion}
                    className="absolute inset-0 size-full object-cover"
                    loop={!reducedMotion}
                    muted
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      if (Number.isFinite(video.duration))
                        video.currentTime = Math.min(1, video.duration / 2);
                    }}
                    onTimeUpdate={
                      minimal
                        ? (event) => {
                            const video = event.currentTarget;
                            if (
                              Number.isFinite(video.duration) &&
                              video.duration > 0
                            )
                              setProgress(video.currentTime / video.duration);
                          }
                        : undefined
                    }
                    playsInline
                    preload="metadata"
                    src="/video/video-preview.mp4"
                    tabIndex={-1}
                  />
                  {minimal ? (
                    <>
                      <div
                        className="absolute inset-x-0 bottom-0 h-2"
                        style={TIMELINE_TRACK_STYLE}
                      >
                        <div
                          className="h-full origin-left"
                          data-testid="feature-preview-progress"
                          style={{
                            ...TIMELINE_PROGRESS_STYLE,
                            background: colorizedTimeline
                              ? getColorizedTimelineBackground(site.color)
                              : TIMELINE_PROGRESS_STYLE.background,
                            transform: `scaleX(${progress})`,
                          }}
                        />
                      </div>
                      <div
                        className="mfs-media-controls"
                        data-mfs-active="true"
                        data-mfs-visible="true"
                        data-mfs-volume-level="high"
                        style={{
                          right: 3,
                          bottom: 11,
                          transform: 'scale(0.5)',
                          transformOrigin: 'bottom right',
                          pointerEvents: 'none',
                        }}
                      >
                        <div className="mfs-volume-pill">
                          <span
                            className="mfs-volume-fill"
                            style={{ height: '70%' }}
                          />
                        </div>
                        <span className="mfs-volume-mute">
                          <svg
                            aria-hidden="true"
                            className="mfs-volume-icon"
                            viewBox="0 0 24 24"
                          >
                            {VOLUME_ICON_PATHS.map(({ className, d }) => (
                              <path
                                className={className}
                                d={d}
                                key={className}
                              />
                            ))}
                          </svg>
                        </span>
                      </div>
                    </>
                  ) : portrait ? (
                    <>
                      <span className="absolute top-1 left-1 text-[6px] font-semibold drop-shadow">
                        {site.name === 'Instagram' ? 'Reels' : 'For You'}
                      </span>
                      <div className="absolute right-1 bottom-5 flex flex-col gap-2 drop-shadow-md">
                        <HeartIcon className="size-2.5 fill-white/90" />
                        <MessageCircleIcon className="size-2.5" />
                        <Share2Icon className="size-2.5" />
                      </div>
                      <div className="absolute inset-x-1 bottom-1 space-y-1">
                        <div className="h-0.5 w-5 rounded bg-white" />
                        <div className="h-0.5 w-7 rounded bg-white/70" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-black/30 px-1 pt-3 pb-1">
                      <div className="mb-1 h-0.5 bg-white/30">
                        <div
                          className="h-full origin-left"
                          style={{
                            backgroundColor: site.color,
                            transform: `scaleX(${progress})`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[5px]">
                        <PauseIcon className="size-2 fill-white" />
                        <Volume2Icon className="size-2" />
                        <SettingsIcon className="ml-auto size-2" />
                        <MaximizeIcon className="size-2" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
