import { BookmarkIcon, MousePointer2Icon } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatTime } from '@/helpers/player-actions';
import {
  TIMELINE_PROGRESS_STYLE,
  TIMELINE_TRACK_STYLE,
} from '@/helpers/timeline-appearance';
import './bookmarks-preview.css';

const bookmarks = [
  { position: 0.28, name: 'Mountain pass', phase: 'first' },
  { position: 0.68, name: 'Forest trail', phase: 'second' },
] as const;

export function BookmarksPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0.08);
  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const jump = (position: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0)
      return;
    video.currentTime = position * video.duration;
    setProgress(position);
    void video.play()?.catch(() => {});
  };

  return (
    <div
      aria-description="A cursor hovers over two sky-blue bookmarks to show their names, then clicks each to play from that point."
      aria-label="Bookmarks feature preview"
      className="relative h-33.75 w-60 overflow-hidden bg-slate-950 text-white"
      role="img"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <video
          autoPlay={!reducedMotion}
          className="absolute inset-0 size-full object-cover"
          loop={!reducedMotion}
          muted
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (!Number.isFinite(video.duration) || video.duration <= 0) return;
            setDuration(video.duration);
            const start = reducedMotion ? 0.28 : 0.08;
            video.currentTime = video.duration * start;
            setProgress(start);
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0)
              setProgress(video.currentTime / video.duration);
          }}
          playsInline
          preload="metadata"
          ref={videoRef}
          src="/video/video-preview.mp4"
          tabIndex={-1}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div
          className="absolute inset-x-0 bottom-0 h-5"
          style={TIMELINE_TRACK_STYLE}
        >
          <div
            className="absolute inset-0 origin-left"
            style={{
              ...TIMELINE_PROGRESS_STYLE,
              transform: `scaleX(${progress})`,
            }}
          />
          {bookmarks.map(({ position, name, phase }) => (
            <div
              className="absolute inset-y-0"
              key={phase}
              style={{ left: `${position * 100}%` }}
            >
              <span className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded-full bg-sky-400 shadow-[0_0_5px_#38bdf855]" />
              <span
                className={`bookmarks-preview-pill bookmarks-preview-pill-${phase} absolute bottom-7 flex -translate-x-1/2 items-center gap-1 rounded-full border border-sky-300/30 bg-black/85 px-2 py-1 text-[9px] whitespace-nowrap shadow-lg`}
              >
                <BookmarkIcon className="size-2.5 fill-sky-400 text-sky-300" />
                {name} · {formatTime(duration * position)}
              </span>
              <span
                className={`bookmarks-preview-click bookmarks-preview-click-${phase} absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200`}
                onAnimationIteration={() => jump(position)}
                onAnimationStart={() => jump(position)}
              />
            </div>
          ))}
        </div>
        <MousePointer2Icon className="bookmarks-preview-cursor absolute -top-1 -left-1 size-5 fill-white text-slate-900 drop-shadow-md" />
      </div>
    </div>
  );
}
