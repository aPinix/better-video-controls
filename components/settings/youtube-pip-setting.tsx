import { PictureInPictureIcon } from 'lucide-react';
import { useId } from 'react';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { YOUTUBE_PIP_OVERRIDE_SHORTCUT } from '@/helpers/youtube-control-icons';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';
import { YouTubePipPreview } from './youtube-pip-preview';

export function YouTubePipSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('PiP Override');
  const autoId = useId();
  const unavailable = disabled || !ready || saving;
  return (
    <CardListItem
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
        BottomSlot:
          settings.youtubePipOverride || error ? (
            <div className="space-y-3">
              {settings.youtubePipOverride && (
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40">
                  <YouTubePipPreview mode="mini-player" />
                  <div className="flex items-center justify-between gap-3">
                    <label
                      className="font-medium text-slate-700 text-xs dark:text-slate-300"
                      htmlFor={autoId}
                    >
                      Open PiP when switching tabs
                    </label>
                    <AppSwitch
                      checked={settings.youtubePipAutoOnTabChange}
                      disabled={unavailable}
                      id={autoId}
                      onCheckedChange={(next) =>
                        save({ youtubePipAutoOnTabChange: next })
                      }
                    />
                  </div>
                  <p className="mt-2 text-slate-500 text-xs dark:text-slate-400">
                    Returns to the page when you switch back.
                  </p>
                </div>
              )}
              {error && (
                <p className="text-red-600 text-xs" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : undefined,
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
