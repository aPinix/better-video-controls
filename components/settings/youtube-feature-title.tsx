import type { ReactNode } from 'react';
import { AppKbd } from '@/components/app/app-kbd';
import {
  YOUTUBE_CONTROL_SHORTCUTS,
  YOUTUBE_PIP_OVERRIDE_SHORTCUT,
  type YouTubeControl,
} from '@/helpers/youtube-control-icons';

export function YouTubeFeatureTitle({
  feature,
  children,
}: {
  feature: YouTubeControl;
  children: ReactNode;
}) {
  const key = (
    feature === 'pip'
      ? YOUTUBE_PIP_OVERRIDE_SHORTCUT
      : YOUTUBE_CONTROL_SHORTCUTS[feature]
  ).toUpperCase();
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      {children}
      <AppKbd
        aria-label={`YouTube shortcut: ${key}`}
        title={`Press ${key} in the YouTube player`}
      >
        {key}
      </AppKbd>
    </span>
  );
}
