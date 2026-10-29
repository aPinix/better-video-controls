import { InfoIcon } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ThumbnailTimeDisplay } from '@/helpers/thumbnail-time';
import { ExtraFeaturePreview } from './extra-feature-preview';
import { LoopSectionsPreview } from './loop-sections-preview';
import { MinimalPlayerPreview } from './minimal-player-preview';
import { watchPreviewTooltipScroll } from './preview-tooltip-scroll';

export const EXTRA_FEATURE_PREVIEW_NAMES = [
  'Timeline Show on Hover',
  'Hover Thumbnails',
  'Loop Sections',
  'Chaptered Timeline',
  'Minimal Player',
  'Match Site Color',
] as const;

export type ExtraFeaturePreviewNameT =
  (typeof EXTRA_FEATURE_PREVIEW_NAMES)[number];

interface ExtraFeaturePreviewTooltipPropsI {
  featureName: ExtraFeaturePreviewNameT;
  colorizedTimeline?: boolean;
  thumbnailTimeDisplay?: ThumbnailTimeDisplay;
}

export function ExtraFeaturePreviewTooltip({
  featureName,
  colorizedTimeline,
  thumbnailTimeDisplay,
}: ExtraFeaturePreviewTooltipPropsI) {
  return (
    <PreviewTooltip title={featureName}>
      {featureName === 'Loop Sections' ? (
        <LoopSectionsPreview />
      ) : featureName === 'Minimal Player' ? (
        <MinimalPlayerPreview colorizedTimeline={colorizedTimeline} />
      ) : (
        <ExtraFeaturePreview
          featureName={featureName}
          thumbnailTimeDisplay={thumbnailTimeDisplay}
        />
      )}
    </PreviewTooltip>
  );
}

export function PreviewTooltip({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  useEffect(() => {
    const trigger = triggerRef.current;
    if (trigger) return watchPreviewTooltipScroll(trigger, setOpen);
  }, []);

  return (
    <TooltipProvider>
      <Tooltip open={open} triggerId={triggerId} onOpenChange={setOpen}>
        <TooltipTrigger
          render={
            <button
              aria-label={`Preview ${title}`}
              className="cursor-help rounded-full text-slate-400 outline-none transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/35 dark:text-slate-500 dark:hover:text-brand-300"
              id={triggerId}
              ref={triggerRef}
              type="button"
            >
              <InfoIcon className="size-3.5" />
            </button>
          }
        />
        <TooltipContent
          aria-label={`${title} preview`}
          className="pointer-events-none overflow-hidden rounded-xl p-0 shadow-2xl shadow-black/60"
          hideArrow
          side="top"
          sideOffset={8}
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
