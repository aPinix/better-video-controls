import { PictureInPictureIcon } from 'lucide-react';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { YOUTUBE_PIP_OVERRIDE_SHORTCUT } from '@/helpers/youtube-control-icons';
import { SettingsExpansion } from './settings-expansion';
import { SubOptionsCard } from './sub-options-card';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';

export function YouTubePipSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('PiP Override');
  const unavailable = disabled || !ready || saving;
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-keyshortcuts={YOUTUBE_PIP_OVERRIDE_SHORTCUT.toUpperCase()}
            aria-label="Use PiP Override on YouTube"
            checked={settings.youtubePipOverride}
            data-youtube-control="pip"
            disabled={unavailable}
            onCheckedChange={(next) =>
              save({
                youtubePipOverride: next,
                ...(next ? { youtubePipAutoOnTabChange: true } : {}),
              })
            }
          />
        ),
        BottomSlot: (
          <SettingsExpansion open={settings.youtubePipOverride} error={error}>
            <SubOptionsCard>
              <div className="flex items-center justify-between gap-3">
                <span
                  className="font-medium text-slate-700 text-xs dark:text-slate-300"
                >
                  Open PiP when switching tabs
                </span>
                <AppSwitch
                  aria-label="Open PiP when switching tabs"
                  checked={settings.youtubePipAutoOnTabChange}
                  disabled={unavailable}
                  onCheckedChange={(next) =>
                    save({ youtubePipAutoOnTabChange: next })
                  }
                  size="sm"
                />
              </div>
              <p className="mt-2 text-slate-500 text-xs dark:text-slate-400">
                Returns to the page when you switch back.
              </p>
            </SubOptionsCard>
          </SettingsExpansion>
        ),
      }}
      description="Use Custom PiP instead of YouTube’s default player."
      icon={PictureInPictureIcon}
      iconIsToggled={settings.youtubePipOverride}
      title={
        <YouTubeFeatureTitle feature="pip">PiP Override</YouTubeFeatureTitle>
      }
    />
  );
}
