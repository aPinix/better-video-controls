import { KeyboardIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { AppKbd } from '@/components/app/app-kbd';
import { AppNumberInput } from '@/components/app/app-number-input';
import { AppSwitch } from '@/components/app/app-switch';
import { SliderResetButton } from '@/components/app/slider-reset-button';
import { CardListItem } from '@/components/popup/card-list-item';
import {
  DEFAULT_PLAYER_TOOLS,
  loadPlayerTools,
  normalizePlayerTools,
  PLAYER_TOOLS_KEY,
  type PlayerToolsSettings,
  savePlayerTools,
} from '@/helpers/player-tools-settings';
import { SettingsExpansion } from './settings-expansion';
import { SubOptionsCard } from './sub-options-card';

export function ArrowSeekSettings({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(String(DEFAULT_PLAYER_TOOLS.backward));
  const [jlValue, setJlValue] = useState(
    String(DEFAULT_PLAYER_TOOLS.jlSeekInterval)
  );
  const [enabled, setEnabled] = useState(true);
  const [arrows, setArrows] = useState(true);
  const [jl, setJl] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(Promise.resolve());
  const writes = useRef(0);
  useEffect(() => {
    let mounted = true;
    const update = (value: unknown) => {
      const settings = normalizePlayerTools(value);
      if (mounted && writes.current === 0) {
        setValue(String(settings.backward));
        setJlValue(String(settings.jlSeekInterval));
        setEnabled(settings.arrowKeySeekingEnabled);
        setArrows(settings.arrowKeysEnabled);
        setJl(settings.jlKeysEnabled);
        setReady(true);
      }
    };
    void loadPlayerTools()
      .then(update)
      .catch(() => setError('Could not load arrow key settings.'));
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area === 'sync' && changes[PLAYER_TOOLS_KEY])
        update(changes[PLAYER_TOOLS_KEY].newValue);
    };
    chrome.storage.onChanged.addListener(changed);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  const persist = (updates: Partial<PlayerToolsSettings>) => {
    setError('');
    writes.current++;
    pending.current = pending.current
      .then(async () => {
        const settings = await loadPlayerTools();
        await savePlayerTools({ ...settings, ...updates });
      })
      .catch(() => setError('Could not save arrow key settings.'))
      .finally(() => {
        writes.current--;
      });
  };
  const interval = (letters: boolean) => {
    const current = letters ? jlValue : value;
    const setCurrent = letters ? setJlValue : setValue;
    const active = letters ? jl : arrows;
    const name = letters ? 'J and L keys' : 'Arrow keys';
    const defaultInterval = letters
      ? DEFAULT_PLAYER_TOOLS.jlSeekInterval
      : DEFAULT_PLAYER_TOOLS.backward;
    const inputId = `${id}-${letters ? 'jl' : 'arrows'}`;
    const save = (input: string) => {
      const parsed = Number(input);
      const seconds =
        input.trim() &&
        Number.isInteger(parsed) &&
        parsed >= 1 &&
        parsed <= 86400
          ? parsed
          : defaultInterval;
      setCurrent(String(seconds));
      persist(
        letters
          ? { jlSeekInterval: seconds }
          : { backward: seconds, forward: seconds }
      );
    };
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-slate-700 text-sm dark:text-slate-300">
            {letters ? (
              <>
                Letter keys <AppKbd>J</AppKbd> <AppKbd>L</AppKbd>
              </>
            ) : (
              <>
                Arrow keys <AppKbd>←</AppKbd> <AppKbd>→</AppKbd>
              </>
            )}
          </span>
          <AppSwitch
            aria-label={
              letters ? 'Seek with J and L keys' : 'Seek with arrow keys'
            }
            checked={active}
            disabled={!ready || disabled || !enabled}
            size="sm"
            onCheckedChange={(next) => {
              if (letters) {
                setJl(next);
                persist({ jlKeysEnabled: next });
              } else {
                setArrows(next);
                persist({ arrowKeysEnabled: next });
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <label
              className="text-slate-500 text-xs dark:text-slate-400"
              htmlFor={inputId}
            >
              Seek interval (secs)
            </label>
            <SliderResetButton
              disabled={
                !ready ||
                disabled ||
                !enabled ||
                !active ||
                Number(current) === defaultInterval
              }
              label={`Reset ${name.toLowerCase()} seek interval to ${defaultInterval} seconds`}
              onClick={() => save(String(defaultInterval))}
            />
          </div>
          <div className="w-22">
            <AppNumberInput
              disabled={!ready || disabled || !enabled || !active}
              id={inputId}
              label={`${name} seek interval (secs)`}
              max={86400}
              min={1}
              onCommit={save}
              onValueChange={setCurrent}
              value={current}
            />
          </div>
        </div>
      </div>
    );
  };
  return (
    <CardListItem
      classNameContentBottom="mt-0"
      title="Arrow Key Seeking Override"
      description="Override player seeking shortcuts on all websites"
      icon={KeyboardIcon}
      iconIsToggled={enabled}
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Enable Arrow Key Seeking Override"
            checked={enabled}
            disabled={!ready || disabled}
            onCheckedChange={(next) => {
              setEnabled(next);
              persist({ arrowKeySeekingEnabled: next });
            }}
          />
        ),
        BottomSlot: (
          <SettingsExpansion open={enabled} error={error}>
            <SubOptionsCard className="space-y-4">
              {interval(false)}
              {interval(true)}
            </SubOptionsCard>
          </SettingsExpansion>
        ),
      }}
    />
  );
}
