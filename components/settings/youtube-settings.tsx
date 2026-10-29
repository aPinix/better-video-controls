import { BookmarkIcon, ChevronRight, ListVideoIcon } from 'lucide-react';
import { type RefObject, useState } from 'react';

import { AppBetaBadge } from '@/components/app/app-beta-badge';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { CardListItemWrapper } from '@/components/popup/card-list-item-wrapper';
import { FeaturePreviewTooltip } from '@/components/popup/feature-preview-tooltip';
import {
  YOUTUBE_CONTROL_ORDER,
  type YouTubeControl,
} from '@/helpers/youtube-control-icons';
import { cn } from '@/lib/utils';
import { YouTubeBookmarksSetting } from './youtube-bookmarks-setting';
import { YouTubeBoostSetting } from './youtube-boost-setting';
import { YouTubeCinemaSetting } from './youtube-cinema-setting';
import { YouTubeFiltersSetting } from './youtube-filters-setting';
import { YouTubeInfoCardsSetting } from './youtube-info-cards-setting';
import { YouTubeLoopSetting } from './youtube-loop-setting';
import { YouTubeMiniPlayerSetting } from './youtube-mini-player-setting';
import { YouTubePipSetting } from './youtube-pip-setting';
import { YouTubePlayerButtonPreview } from './youtube-player-button-preview';
import { YouTubeScreenshotSetting } from './youtube-screenshot-setting';

export function YouTubeSettings({
  chapteredTimelineEnabled,
  extensionEnabled,
  onChapteredTimelineEnabledChange,
  onOpenSavedLibrary,
  savedLibraryEntryRef,
}: {
  chapteredTimelineEnabled: boolean;
  extensionEnabled: boolean;
  onChapteredTimelineEnabledChange: (enabled: boolean) => void;
  onOpenSavedLibrary: (pointer: boolean) => void;
  savedLibraryEntryRef?: RefObject<HTMLDivElement | null>;
}) {
  const [activePreview, setActivePreview] = useState<YouTubeControl | null>(
    null
  );
  const highlightRow = (target: EventTarget | null) => {
    const feature =
      target instanceof Element
        ? target
            .closest('.card-list-item')
            ?.querySelector('[data-youtube-control]')
            ?.getAttribute('data-youtube-control')
        : null;
    setActivePreview(
      YOUTUBE_CONTROL_ORDER.find((control) => control === feature) ?? null
    );
  };
  return (
    <>
      <section
        aria-label="YouTube player settings"
        className={cn(
          'relative rounded-xl bg-white dark:bg-slate-800/70',
          !extensionEnabled && 'pointer-events-none opacity-50'
        )}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setActivePreview(null);
        }}
        onFocus={(event) => highlightRow(event.target)}
        onMouseLeave={(event) =>
          highlightRow(event.currentTarget.ownerDocument.activeElement)
        }
        onMouseOver={(event) => highlightRow(event.target)}
      >
        <div className="sticky top-16 z-20">
          <YouTubePlayerButtonPreview feature={activePreview} />
        </div>
        <CardListItemWrapper className="[&>.card-list-item:first-child]:rounded-t-none">
          <YouTubeBoostSetting disabled={!extensionEnabled} />
          <YouTubeCinemaSetting disabled={!extensionEnabled} />
          <YouTubeLoopSetting disabled={!extensionEnabled} />
          <YouTubeBookmarksSetting disabled={!extensionEnabled} />
          <YouTubeInfoCardsSetting disabled={!extensionEnabled} />
          <YouTubeScreenshotSetting disabled={!extensionEnabled} />
          <YouTubeFiltersSetting disabled={!extensionEnabled} />
          <YouTubeMiniPlayerSetting disabled={!extensionEnabled} />
          <YouTubePipSetting disabled={!extensionEnabled} />
          <CardListItem
            components={{
              RightSlot: (
                <AppSwitch
                  aria-label="Use chaptered timeline on YouTube"
                  checked={chapteredTimelineEnabled}
                  disabled={!extensionEnabled}
                  onCheckedChange={onChapteredTimelineEnabledChange}
                />
              ),
            }}
            description="Timeline feature: show YouTube chapter divisions and names"
            icon={ListVideoIcon}
            iconIsToggled={chapteredTimelineEnabled}
            title={
              <span className="inline-flex items-center gap-2">
                Chaptered Timeline
                <FeaturePreviewTooltip feature="chapters" />
                <AppBetaBadge
                  featureName="Chaptered Timeline"
                  tooltip={
                    <>
                      <strong>Chaptered Timeline</strong> is in beta and may
                      need adjustments as YouTube updates its players.
                    </>
                  }
                />
              </span>
            }
          />
        </CardListItemWrapper>
      </section>
      <div className="relative mt-3" ref={savedLibraryEntryRef}>
        <button
          aria-label="Saved bookmarks & loops"
          className="absolute inset-0 w-full cursor-pointer rounded-xl"
          onClick={(event) => onOpenSavedLibrary(event.detail > 0)}
          type="button"
        />
        <CardListItem
          components={{
            RightSlot: (
              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            ),
          }}
          description="Browse your saved YouTube videos, bookmarks, and loop sections."
          icon={BookmarkIcon}
          title={
            <span className="inline-flex max-w-full items-center gap-1.5">
              Saved bookmarks &amp; loops
              <span className="relative">
                <FeaturePreviewTooltip feature="library" />
              </span>
            </span>
          }
        />
      </div>
    </>
  );
}
