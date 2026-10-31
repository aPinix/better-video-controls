import { useEffect, useRef, useState } from 'react';
import './auto-skip-preview.css';

type Phase = 'playing' | 'ended' | 'next' | 'reset';
const ENDING_SECONDS = 2.2;

export function AutoSkipPreview() {
  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const [phase, setPhase] = useState<Phase>(reducedMotion ? 'next' : 'playing');
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const nextRef = useRef<HTMLVideoElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const schedule = (action: () => void, delay: number) => {
    timers.current.push(setTimeout(action, delay));
  };
  const prepare = (video: HTMLVideoElement) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = reducedMotion
      ? Math.max(0, video.duration - 0.05)
      : Math.max(0, video.duration - ENDING_SECONDS);
  };
  const restart = () => {
    nextRef.current?.pause();
    for (const video of [leftRef.current, rightRef.current]) {
      if (!video) continue;
      prepare(video);
      void video.play()?.catch(() => {});
    }
    setProgress(0);
    setPhase('playing');
  };
  const finish = () => {
    if (reducedMotion) return;
    const left = leftRef.current;
    if (left && Number.isFinite(left.duration)) {
      left.pause();
      left.currentTime = left.duration;
    }
    setProgress(1);
    setPhase('ended');
    schedule(() => {
      setPhase('next');
      const next = nextRef.current;
      if (next) {
        next.currentTime = 0;
        void next.play()?.catch(() => {});
      }
      schedule(() => {
        setPhase('reset');
        schedule(restart, 200);
      }, 2800);
    }, 300);
  };

  return (
    <div
      className={`auto-skip-preview phase-${phase} absolute inset-0 grid grid-cols-2 divide-x divide-white/15 bg-slate-950`}
    >
      {[false, true].map((enabled) => (
        <div
          className="flex flex-col items-center gap-1.5 pt-1.5"
          key={String(enabled)}
        >
          <span className="text-[9px] font-medium text-white/85">
            Auto-skip {enabled ? 'on' : 'off'}
          </span>
          <div className="auto-skip-preview-phone relative h-25 w-14 overflow-hidden rounded-md border border-white/30 bg-black">
            <div
              className={enabled ? 'auto-skip-preview-feed h-full' : 'h-full'}
            >
              <div className="relative h-full">
                <video
                  autoPlay={!reducedMotion}
                  className="absolute inset-0 size-full object-cover"
                  muted
                  onEnded={enabled ? finish : undefined}
                  onLoadedMetadata={(event) => prepare(event.currentTarget)}
                  onTimeUpdate={
                    enabled
                      ? (event) => {
                          const video = event.currentTarget;
                          if (
                            Number.isFinite(video.duration) &&
                            video.duration > 0
                          )
                            setProgress(
                              Math.max(
                                0,
                                Math.min(
                                  1,
                                  (video.currentTime -
                                    Math.max(
                                      0,
                                      video.duration - ENDING_SECONDS
                                    )) /
                                    Math.min(ENDING_SECONDS, video.duration)
                                )
                              )
                            );
                        }
                      : undefined
                  }
                  playsInline
                  preload="auto"
                  ref={enabled ? rightRef : leftRef}
                  src="/video/video-preview.mp4"
                  tabIndex={-1}
                />
                <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[6px]">
                  Video 1
                </span>
                <span className="absolute inset-x-0 bottom-1 bg-black/65 py-1 text-center text-[7px]">
                  {phase === 'playing' ? 'Playing' : 'Ended'}
                </span>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/25">
                  <div
                    className="h-full origin-left bg-white"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </div>
              </div>
              {enabled && (
                <div className="relative h-full overflow-hidden">
                  <video
                    className="absolute inset-0 size-full scale-125 object-cover object-right"
                    loop={!reducedMotion}
                    muted
                    onLoadedMetadata={(event) => {
                      const video = event.currentTarget;
                      if (Number.isFinite(video.duration))
                        video.currentTime = Math.min(1, video.duration / 2);
                    }}
                    playsInline
                    preload="auto"
                    ref={nextRef}
                    src="/video/video-preview.mp4"
                    tabIndex={-1}
                  />
                  <span className="absolute top-1 left-1 rounded bg-black/60 px-1 text-[6px]">
                    Video 2
                  </span>
                  <span className="absolute inset-x-0 bottom-1 bg-black/65 py-1 text-center text-[7px] text-lime-300">
                    Playing next
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
