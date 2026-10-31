import { PictureInPicture2Icon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppButton } from '@/components/app/app-button';
import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { FeaturePreviewTooltip } from '@/components/popup/feature-preview-tooltip';
import {
  DEFAULT_MINI_PLAYER_GEOMETRY,
  MINI_PLAYER_GEOMETRY_KEY,
  type MiniPlayerGeometry,
  normalizeMiniPlayerGeometry,
} from '@/helpers/mini-player-settings';
import { SettingsExpansion } from './settings-expansion';
import { SubOptionsCard } from './sub-options-card';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';

export function YouTubeMiniPlayerSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('Mini Player');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [geometry, setGeometry] = useState<MiniPlayerGeometry | null>(null);
  useEffect(() => {
    let mounted = true;
    let changedSinceLoad = false;
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'local' && changes[MINI_PLAYER_GEOMETRY_KEY]) {
        changedSinceLoad = true;
        setGeometry(
          normalizeMiniPlayerGeometry(
            changes[MINI_PLAYER_GEOMETRY_KEY].newValue
          )
        );
      }
    };
    chrome.storage.onChanged.addListener(changed);
    void chrome.storage.local
      .get(MINI_PLAYER_GEOMETRY_KEY)
      .then((data) => {
        if (mounted && !changedSinceLoad)
          setGeometry(
            normalizeMiniPlayerGeometry(data[MINI_PLAYER_GEOMETRY_KEY])
          );
      })
      .catch(() => {
        if (mounted && !changedSinceLoad)
          setResetError('Could not load Mini Player position and size.');
      });
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  const canReset =
    geometry !== null &&
    (geometry.x !== DEFAULT_MINI_PLAYER_GEOMETRY.x ||
      geometry.y !== DEFAULT_MINI_PLAYER_GEOMETRY.y ||
      geometry.width !== DEFAULT_MINI_PLAYER_GEOMETRY.width);
  const unavailable = disabled || !ready || saving || resetting;
  const reset = async () => {
    setResetting(true);
    setResetError('');
    try {
      await chrome.storage.local.set({
        [MINI_PLAYER_GEOMETRY_KEY]: { ...DEFAULT_MINI_PLAYER_GEOMETRY },
      });
      setGeometry({ ...DEFAULT_MINI_PLAYER_GEOMETRY });
    } catch {
      setResetError('Could not reset Mini Player position and size.');
    } finally {
      setResetting(false);
    }
  };
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Use Mini Player on YouTube"
            checked={settings.miniPlayer}
            disabled={unavailable}
            onCheckedChange={(next) => save({ miniPlayer: next })}
          />
        ),
        BottomSlot: (
          <SettingsExpansion
            error={error || resetError}
            open={settings.miniPlayer}
          >
            <SubOptionsCard>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                Drag to move and resize from the corner. Your layout is saved on
                this device.
              </p>
              <AppButton
                disabled={unavailable || !canReset}
                onClick={() => void reset()}
                size="sm"
              >
                <RotateCcwIcon className="size-3.5" />
                Reset position and size
              </AppButton>
            </SubOptionsCard>
          </SettingsExpansion>
        ),
      }}
      description="Keep playing videos visible when you scroll down."
      icon={PictureInPicture2Icon}
      iconIsToggled={settings.miniPlayer}
      title={
        <span className="inline-flex items-center gap-1.5">
          Mini Player
          <FeaturePreviewTooltip feature="miniPlayer" />
        </span>
      }
    />
  );
}
