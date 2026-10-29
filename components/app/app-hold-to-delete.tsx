import { Trash2Icon } from 'lucide-react';
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import '@/styles/hold-to-delete.css';

const HOLD_DURATION_MS = 2000;
type HoldInput = number | 'Enter' | ' ';

export function AppHoldToDelete({
  label,
  disabled = false,
  onDelete,
}: {
  label: string;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const holdRef = useRef<{
    input: HoldInput;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelHold = useCallback(() => {
    if (!holdRef.current) return;
    clearTimeout(holdRef.current.timer);
    holdRef.current = null;
    setHolding(false);
  }, []);

  useEffect(() => {
    if (disabled) cancelHold();
    return cancelHold;
  }, [cancelHold, disabled]);

  useEffect(() => {
    if (!holding) return;
    window.addEventListener('blur', cancelHold);
    window.addEventListener('scroll', cancelHold, true);
    document.addEventListener('visibilitychange', cancelHold);
    return () => {
      window.removeEventListener('blur', cancelHold);
      window.removeEventListener('scroll', cancelHold, true);
      document.removeEventListener('visibilitychange', cancelHold);
    };
  }, [cancelHold, holding]);

  const startHold = (input: HoldInput) => {
    if (disabled || holdRef.current) return;
    setHolding(true);
    holdRef.current = {
      input,
      timer: setTimeout(() => {
        holdRef.current = null;
        setHolding(false);
        const button = buttonRef.current;
        if (!button || button.disabled || button.closest('[inert]')) return;
        onDelete();
      }, HOLD_DURATION_MS),
    };
  };

  const cancelPointerHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (holdRef.current?.input === event.pointerId) cancelHold();
  };

  return (
    <Button
      aria-description="Press and hold for 2 seconds to delete. Release to cancel."
      aria-label={label}
      className="hold-to-delete relative overflow-hidden rounded-full p-0 touch-pan-y"
      data-holding={holding || undefined}
      disabled={disabled}
      onBlur={cancelHold}
      onClick={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancelHold();
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        if (!event.repeat) startHold(event.key);
      }}
      onKeyUp={(event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        if (holdRef.current?.input === event.key) cancelHold();
      }}
      onLostPointerCapture={cancelPointerHold}
      onPointerCancel={cancelPointerHold}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        startHold(event.pointerId);
      }}
      onPointerLeave={cancelPointerHold}
      onPointerMove={(event) => {
        if (holdRef.current?.input !== event.pointerId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          cancelHold();
      }}
      onPointerUp={cancelPointerHold}
      ref={buttonRef}
      size="icon-sm"
      title="Hold for 2 seconds to delete"
      type="button"
      variant="destructive"
    >
      <Trash2Icon aria-hidden="true" />
      <span
        aria-hidden="true"
        className="hold-to-delete-overlay pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-destructive text-white"
        style={{ transitionDuration: `${holding ? HOLD_DURATION_MS : 200}ms` }}
      >
        <Trash2Icon />
      </span>
    </Button>
  );
}
