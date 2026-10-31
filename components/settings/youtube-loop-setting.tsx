import { RepeatIcon } from 'lucide-react';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { cn } from '@/lib/utils';
import { SettingsExpansion } from './settings-expansion';
import { SUB_OPTIONS_CARD_CLASS_NAME } from './sub-options-card';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';

export function YouTubeLoopSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('Loop Sections');
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Show Loop Sections button on YouTube"
            checked={settings.youtubeLoop}
            data-youtube-control="loop"
            disabled={disabled || !ready || saving}
            onCheckedChange={(next) => save({ youtubeLoop: next })}
          />
        ),
        BottomSlot: (
          <SettingsExpansion error={error} open={settings.youtubeLoop}>
            <div
              className={cn(
                SUB_OPTIONS_CARD_CLASS_NAME,
                'flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300'
              )}
              data-slot="settings-sub-options"
            >
              <span aria-hidden="true">
                <span className="block">Remember loops in videos</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Save sections for your next visit.
                </span>
              </span>
              <AppSwitch
                aria-label="Remember loops in videos"
                checked={settings.rememberYoutubeLoops}
                disabled={disabled || !ready || saving}
                onCheckedChange={(next) => save({ rememberYoutubeLoops: next })}
                size="sm"
              />
            </div>
          </SettingsExpansion>
        ),
      }}
      description="Add a button to repeat sections of the video"
      icon={RepeatIcon}
      iconIsToggled={settings.youtubeLoop}
      title={
        <YouTubeFeatureTitle feature="loop">Loop Sections</YouTubeFeatureTitle>
      }
    />
  );
}
