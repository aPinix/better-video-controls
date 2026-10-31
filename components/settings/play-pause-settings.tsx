import { PlayIcon } from 'lucide-react';
import { AppKbd } from '@/components/app/app-kbd';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { getPrimaryModifierLabel } from '@/helpers/wheel-actions';
import { SettingsExpansion } from './settings-expansion';
import { SubOptionsCard } from './sub-options-card';

export function PlayPauseSettings({
  enabled,
  middleClickEnabled,
  wheelEnabled,
  kKeyEnabled,
  onKKeyEnabledChange,
  onEnabledChange,
  onMiddleClickEnabledChange,
  onWheelEnabledChange,
  disabled = false,
}: {
  enabled: boolean;
  middleClickEnabled: boolean;
  wheelEnabled: boolean;
  kKeyEnabled: boolean;
  onKKeyEnabledChange: (enabled: boolean) => void;
  onEnabledChange: (enabled: boolean) => void;
  onMiddleClickEnabledChange: (enabled: boolean) => void;
  onWheelEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const modifier = getPrimaryModifierLabel();
  const key = modifier === 'Command' ? '⌘' : modifier;
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Enable Play / Pause"
            checked={enabled}
            disabled={disabled}
            onCheckedChange={(next) => onEnabledChange(next)}
          />
        ),
        BottomSlot: (
          <SettingsExpansion open={enabled}>
            <SubOptionsCard className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                  Keyboard shortcut <AppKbd>K</AppKbd>
                </span>
                <AppSwitch
                  aria-label="Enable K key play pause"
                  checked={kKeyEnabled}
                  disabled={disabled || !enabled}
                  onCheckedChange={(next) => onKKeyEnabledChange(next)}
                  size="sm"
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Middle-click
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click the mouse wheel on the video to play or pause
                  </p>
                </div>
                <AppSwitch
                  aria-label="Enable middle-click play pause"
                  checked={middleClickEnabled}
                  disabled={disabled || !enabled}
                  onCheckedChange={(next) => onMiddleClickEnabledChange(next)}
                  size="sm"
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {modifier} + Scroll
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hold{' '}
                    <AppKbd aria-label={`${modifier} + Scroll Left`}>
                      {key} + Scroll Left
                    </AppKbd>{' '}
                    to pause,{' '}
                    <AppKbd aria-label={`${modifier} + Scroll Right`}>
                      {key} + Scroll Right
                    </AppKbd>{' '}
                    to play
                  </p>
                </div>
                <AppSwitch
                  aria-label="Enable directional play pause wheel actions"
                  checked={wheelEnabled}
                  disabled={disabled || !enabled}
                  onCheckedChange={(next) => onWheelEnabledChange(next)}
                  size="sm"
                />
              </div>
            </SubOptionsCard>
          </SettingsExpansion>
        ),
      }}
      description="Control playback with mouse gestures"
      icon={PlayIcon}
      iconIsToggled={enabled}
      title="Play / Pause"
    />
  );
}
