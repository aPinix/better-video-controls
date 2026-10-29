// Device-local transient messages, separate from saved/synced preferences.
export const CINEMA_PREVIEW_KEY = 'cinemaDimmingPreview';
export type CinemaDimmingPreview = {
  owner: string;
  active: boolean;
  dimming: number;
};
export function isCinemaDimmingPreview(
  value: unknown
): value is CinemaDimmingPreview {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<CinemaDimmingPreview>;
  return (
    typeof message.owner === 'string' &&
    typeof message.active === 'boolean' &&
    typeof message.dimming === 'number' &&
    Number.isFinite(message.dimming) &&
    message.dimming >= 0 &&
    message.dimming <= 100
  );
}
