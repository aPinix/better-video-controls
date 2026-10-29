import { useCallback, useEffect, useRef, useState } from 'react';
import { CINEMA_PREVIEW_KEY } from '@/helpers/player-cinema-preview';

let queue = Promise.resolve();

export function useCinemaDimmingPreview() {
  const owner = useRef(crypto.randomUUID());
  const dimming = useRef(80);
  const active = useRef(false);
  const heartbeat = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const publish = useCallback((enabled: boolean) => {
    const message = {
      owner: owner.current,
      active: enabled,
      dimming: dimming.current,
    };
    queue = queue
      .catch(() => {})
      .then(async () => {
        try {
          await chrome.storage.local.set({ [CINEMA_PREVIEW_KEY]: message });
          if (mounted.current) setError('');
        } catch {
          if (mounted.current)
            setError('Could not preview page dimming on YouTube.');
        }
      });
  }, []);
  const end = useCallback(() => {
    clearInterval(heartbeat.current);
    heartbeat.current = undefined;
    if (!active.current) return;
    active.current = false;
    publish(false);
  }, [publish]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      end();
    };
  }, [end]);
  const update = (value: number) => {
    dimming.current = value;
    active.current = true;
    publish(true);
    heartbeat.current ??= setInterval(() => publish(true), 1000);
  };
  return { update, end, error };
}
