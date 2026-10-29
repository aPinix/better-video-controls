import type { ReactNode } from 'react';
import type { ScreenshotFormat } from '@/helpers/player-tools-settings';
import { AppKbd } from '@/components/app/app-kbd';
import { FeaturePreviewTooltip } from '@/components/popup/feature-preview-tooltip';
import {
  YOUTUBE_CONTROL_SHORTCUTS,
  YOUTUBE_PIP_OVERRIDE_SHORTCUT,
  type YouTubeControl,
} from '@/helpers/youtube-control-icons';

export function YouTubeFeatureTitle({
  feature,
  children,
  screenshotFormat,
  boostLevel,
}: {
  feature: YouTubeControl;
  children: ReactNode;
  screenshotFormat?: ScreenshotFormat;
  boostLevel?: number;
}) {
  const key = (
    feature === 'pip'
      ? YOUTUBE_PIP_OVERRIDE_SHORTCUT
      : YOUTUBE_CONTROL_SHORTCUTS[feature]
  ).toUpperCase();
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      {children}
      <FeaturePreviewTooltip
        feature={feature}
        boostLevel={boostLevel}
        screenshotFormat={screenshotFormat}
      />
      <AppKbd
        aria-label={`YouTube shortcut: ${key}`}
        title={`Press ${key} in the YouTube player`}
      >
        {key}
      </AppKbd>
    </span>
  );
}
