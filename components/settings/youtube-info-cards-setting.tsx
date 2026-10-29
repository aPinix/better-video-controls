import { AppSwitch } from '@/components/app/app-switch';
import { CardListItem } from '@/components/popup/card-list-item';
import { YouTubeInfoCardsIcon } from '@/components/youtube-info-cards-icon';
import { usePlayerToolsPreferences } from './use-player-tools-preferences';
import { YouTubeFeatureTitle } from './youtube-feature-title';

export function YouTubeInfoCardsSetting({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { settings, ready, saving, error, save } =
    usePlayerToolsPreferences('End-screen cards');
  return (
    <CardListItem
      components={{
        RightSlot: (
          <AppSwitch
            aria-label="Show End-screen cards button on YouTube"
            checked={settings.youtubeInfoCardsEnabled}
            data-youtube-control="infoCards"
            disabled={disabled || !ready || saving}
            onCheckedChange={(next) => save({ youtubeInfoCardsEnabled: next })}
          />
        ),
        BottomSlot: error ? (
          <p className="text-red-600 text-xs" role="alert">
            {error}
          </p>
        ) : undefined,
      }}
      description="Add a player button to hide or show recommendations. Off restores YouTube’s normal behavior."
      icon={YouTubeInfoCardsIcon}
      iconIsToggled={settings.youtubeInfoCardsEnabled}
      title={
        <YouTubeFeatureTitle feature="infoCards">
          End-screen cards
        </YouTubeFeatureTitle>
      }
    />
  );
}
