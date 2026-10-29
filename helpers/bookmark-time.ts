export function formatBookmarkTime(seconds: number): string {
  const total = Math.round(
    Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000
  );
  const whole = Math.floor(total / 1000);
  const hours = String(Math.floor(whole / 3600)).padStart(2, '0');
  const minutes = String(Math.floor(whole / 60) % 60).padStart(2, '0');
  const secs = String(whole % 60).padStart(2, '0');
  const millis = total % 1000;
  return `${hours}:${minutes}:${secs}${millis ? `.${String(millis).padStart(3, '0')}` : ''}`;
}

/** Accept timestamps, minute:second shorthand, or a number of seconds. */
export function parseBookmarkTime(value: string): number | null {
  const parts = value.trim().split(':');
  if (!parts.length || parts.length > 3) return null;
  const seconds = parts.pop();
  if (
    !seconds ||
    !/^\d+(?:\.\d{1,3})?$/.test(seconds) ||
    parts.some((part) => !/^\d+$/.test(part))
  )
    return null;
  if (parts.length && Number(seconds) >= 60) return null;
  if (parts.length === 2 && Number(parts[1]) >= 60) return null;
  const total = [...parts, seconds].reduce(
    (time, part) => time * 60 + Number(part),
    0
  );
  return Number.isSafeInteger(Math.round(total * 1000)) ? total : null;
}
