import { Volume2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  BOOST_DISTORTION_WARNING_LEVEL,
  DEFAULT_PLAYER_TOOLS,
  MAX_VOLUME_BOOST,
} from '@/helpers/player-tools-settings';

export function BoostVolumePreview({
  level = DEFAULT_PLAYER_TOOLS.youtubeBoost,
}: {
  level?: number;
}) {
  const target = Math.max(2, Math.min(MAX_VOLUME_BOOST, level)) * 100;
  const baseline = (100 / target) * 100;
  const reducedMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const [volume, setVolume] = useState(reducedMotion ? target : 100);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let lastVolume = 100;
    const started = performance.now();
    const ease = (progress: number) => (1 - Math.cos(Math.PI * progress)) / 2;
    const update = (now: number) => {
      const time = (now - started) % 6000;
      const boost =
        time < 1000
          ? 0
          : time < 2800
            ? ease((time - 1000) / 1800)
            : time < 4000
              ? 1
              : time < 5400
                ? 1 - ease((time - 4000) / 1400)
                : 0;
      const next = Math.round(100 + boost * (target - 100));
      if (next !== lastVolume) {
        setVolume(next);
        lastVolume = next;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, target]);

  return (
    <div className="absolute inset-x-7 top-7 rounded-xl border border-white/15 bg-black/75 p-3 shadow-lg backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between text-xs">
        <Volume2Icon className="size-4" />
        <span className="font-semibold tabular-nums">{volume}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/20">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-white/90"
          style={{ width: `${baseline}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 overflow-hidden rounded-r-full"
          style={{ width: `${100 - baseline}%` }}
        >
          <div
            className="h-full origin-left bg-amber-400 transition-transform duration-75 ease-linear motion-reduce:transition-none"
            style={{ transform: `scaleX(${(volume - 100) / (target - 100)})` }}
          />
        </div>
      </div>
      <div className="relative mt-2 h-3 text-[8px] text-white/65">
        <span
          className="absolute -translate-x-1/2"
          style={{ left: `${baseline}%` }}
        >
          100%
        </span>
        <span className="absolute right-0 text-amber-300">{target}%</span>
      </div>
      <p className="mt-1 min-h-3 text-[8px] text-amber-300">
        {volume >= BOOST_DISTORTION_WARNING_LEVEL * 100
          ? 'May distort audio'
          : ''}
      </p>
    </div>
  );
}
