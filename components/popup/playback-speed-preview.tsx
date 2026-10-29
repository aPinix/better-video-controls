import { GaugeIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function PlaybackSpeedPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [fast, setFast] = useState(false);
  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  useEffect(() => {
    if (!ready || reducedMotion) return;
    let faster = false;
    const timer = setInterval(() => {
      faster = !faster;
      if (videoRef.current) videoRef.current.playbackRate = faster ? 2 : 1;
      setFast(faster);
    }, 3000);
    return () => clearInterval(timer);
  }, [ready, reducedMotion]);

  return (
    <div className="absolute inset-0">
      <video
        autoPlay={!reducedMotion}
        className="absolute inset-0 size-full object-cover"
        loop={!reducedMotion}
        muted
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          video.playbackRate = 1;
          if (reducedMotion && Number.isFinite(video.duration))
            video.currentTime = Math.min(3.45, video.duration / 2);
          setReady(true);
        }}
        playsInline
        preload="metadata"
        ref={videoRef}
        src="/video/video-preview.mp4"
        tabIndex={-1}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
      <div className="absolute inset-x-5 bottom-3 rounded-xl border border-white/15 bg-black/75 p-2.5 backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-2 text-[10px]">
          <GaugeIcon className="size-3.5 text-violet-300" />
          <span className="flex-1">
            {fast ? 'Twice as fast' : 'Normal speed'}
          </span>
          <span className="font-semibold tabular-nums">
            {fast ? '2×' : '1×'}
          </span>
        </div>
        <div className="relative h-1 rounded-full bg-white/20">
          <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-white/90" />
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden rounded-r-full">
            <div
              className="h-full origin-left bg-violet-400 transition-transform duration-300 motion-reduce:transition-none"
              style={{
                transform: `scaleX(${fast ? 1 : 0})`,
                transitionTimingFunction: 'cubic-bezier(0.77, 0, 0.175, 1)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
