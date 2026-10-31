import type { ScreenshotFormat } from '@/helpers/player-tools-settings';
import type { ThumbnailTimeDisplay } from '@/helpers/thumbnail-time';
import { PreviewTooltip } from './extra-feature-preview-tooltip';
import {
  FEATURE_PREVIEW_DETAILS,
  FeaturePreview,
  type FeaturePreviewId,
} from './feature-preview';

export function FeaturePreviewTooltip({
  feature,
  thumbnailTimeDisplay,
  screenshotFormat,
  boostLevel,
}: {
  feature: FeaturePreviewId;
  thumbnailTimeDisplay?: ThumbnailTimeDisplay;
  screenshotFormat?: ScreenshotFormat;
  boostLevel?: number;
}) {
  const { title } = FEATURE_PREVIEW_DETAILS[feature];
  return (
    <PreviewTooltip title={title}>
      <FeaturePreview
        boostLevel={boostLevel}
        feature={feature}
        screenshotFormat={screenshotFormat}
        thumbnailTimeDisplay={thumbnailTimeDisplay}
      />
    </PreviewTooltip>
  );
}
