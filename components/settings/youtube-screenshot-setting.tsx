import { AppSegment } from '@/components/app/app-segment';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { YouTubeScreenshotIcon } from '@/components/youtube-screenshot-icon';
import { cn } from '@/lib/utils';
import { SettingsExpansion } from './settings-expansion';
import { SUB_OPTIONS_CARD_CLASS_NAME } from './sub-options-card';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';

export function YouTubeScreenshotSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('Screenshot');
  const unavailable = disabled || !ready || saving;
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Show Screenshot button on YouTube"
            checked={settings.youtubeScreenshotEnabled}
            data-youtube-control="screenshot"
            disabled={unavailable}
            onCheckedChange={(next) => save({ youtubeScreenshotEnabled: next })}
          />
        ),
        BottomSlot: (
          <SettingsExpansion
            error={error}
            open={settings.youtubeScreenshotEnabled}
          >
            <div
              className={cn(
                SUB_OPTIONS_CARD_CLASS_NAME,
                'space-y-3 text-xs text-slate-600 dark:text-slate-300'
              )}
              data-slot="settings-sub-options"
            >
              <div className="flex items-center justify-between gap-3">
                <span>Format</span>
                <AppSegment
                  className="w-32"
                  disabled={unavailable}
                  label="Screenshot format"
                  onValueChange={(format) =>
                    save({ youtubeScreenshotFormat: format })
                  }
                  options={[
                    { label: 'JPEG', value: 'jpeg' },
                    { label: 'PNG', value: 'png' },
                  ]}
                  value={settings.youtubeScreenshotFormat}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span aria-hidden="true">Include video filter effects</span>
                <AppSwitch
                  aria-label="Include video filter effects in screenshots"
                  checked={settings.youtubeScreenshotIncludeFilters}
                  disabled={unavailable}
                  onCheckedChange={(next) =>
                    save({ youtubeScreenshotIncludeFilters: next })
                  }
                  size="sm"
                />
              </div>
            </div>
          </SettingsExpansion>
        ),
      }}
      description="Add a button to save the current video frame as JPEG or PNG"
      icon={YouTubeScreenshotIcon}
      iconIsToggled={settings.youtubeScreenshotEnabled}
      title={
        <YouTubeFeatureTitle
          feature="screenshot"
          screenshotFormat={settings.youtubeScreenshotFormat}
        >
          Screenshot
        </YouTubeFeatureTitle>
      }
    />
  );
}
