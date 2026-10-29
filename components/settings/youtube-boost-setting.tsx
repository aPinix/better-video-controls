import { Volume2Icon } from 'lucide-react';
import { AppSlider } from '@/components/app/app-slider';
import { AppSwitch } from '@/components/app/app-switch';
import { SliderResetButton } from '@/components/app/slider-reset-button';
import { CardListItem } from '@/components/popup/card-list-item';
import {
  BOOST_DISTORTION_WARNING,
  BOOST_DISTORTION_WARNING_LEVEL,
  MAX_VOLUME_BOOST,
} from '@/helpers/player-tools-settings';
import { cn } from '@/lib/utils';
import { SettingsExpansion } from './settings-expansion';
import { SubOptionsCard } from './sub-options-card';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';

export function YouTubeBoostSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save, preview } =
    usePlayerToolsPreferences('volume boost');
  const controlsDisabled = disabled || !ready || saving;
  const value = settings.youtubeBoost;
  const highBoost = value >= BOOST_DISTORTION_WARNING_LEVEL;
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Show Boost Volume button on YouTube"
            checked={settings.youtubeBoostEnabled}
            data-youtube-control="boost"
            disabled={controlsDisabled}
            onCheckedChange={(next) => save({ youtubeBoostEnabled: next })}
          />
        ),
        BottomSlot: (
          <SettingsExpansion open={settings.youtubeBoostEnabled} error={error}>
            <SubOptionsCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700 text-xs dark:text-slate-300">
                    Boost level
                  </span>
                  <SliderResetButton
                    disabled={controlsDisabled || value === 2}
                    label="Reset boost level to default"
                    onClick={() => save({ youtubeBoost: 2 })}
                  />
                </div>
                <span
                  className={cn(
                    'min-w-10 text-right font-semibold text-xs tabular-nums',
                    highBoost
                      ? 'text-amber-600 dark:text-amber-300'
                      : 'text-brand dark:text-brand-300'
                  )}
                >
                  {value}×
                </span>
              </div>
              <AppSlider
                aria-label="Volume boost multiplier"
                aria-valuetext={`${value} times${highBoost ? '. High boost may distort audio.' : ''}`}
                className={cn(
                  'mt-1 rounded-full has-focus-visible:ring-2 has-focus-visible:ring-brand/35',
                  highBoost && '[&_[data-slot=app-slider-range]]:bg-amber-500!'
                )}
                disabled={controlsDisabled}
                max={MAX_VOLUME_BOOST}
                min={2}
                onValueChange={(next) =>
                  preview({
                    youtubeBoost: Array.isArray(next) ? (next[0] ?? 2) : next,
                  })
                }
                onValueCommitted={(next) =>
                  save({
                    youtubeBoost: Array.isArray(next) ? (next[0] ?? 2) : next,
                  })
                }
                step={1}
                thumbClassName="after:opacity-0"
                trackClassName="h-3"
                value={value}
              />
              <div className="-mt-2 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span>2×</span>
                <span>{MAX_VOLUME_BOOST}×</span>
              </div>
              <p
                className="mt-2 text-amber-700 text-xs leading-snug empty:hidden dark:text-amber-300"
                role="status"
              >
                {highBoost ? BOOST_DISTORTION_WARNING : ''}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-medium text-slate-700 text-xs dark:text-slate-300">
                  Automatically boost the volume
                </span>
                <AppSwitch
                  aria-label="Automatically boost the volume"
                  checked={settings.youtubeAutoBoost}
                  disabled={controlsDisabled}
                  onCheckedChange={(next) => save({ youtubeAutoBoost: next })}
                  size="sm"
                />
              </div>
            </SubOptionsCard>
          </SettingsExpansion>
        ),
      }}
      description="Add a button to boost the video’s volume"
      icon={Volume2Icon}
      iconIsToggled={settings.youtubeBoostEnabled}
      title={
        <YouTubeFeatureTitle feature="boost" boostLevel={value}>
          Boost Volume
        </YouTubeFeatureTitle>
      }
    />
  );
}
