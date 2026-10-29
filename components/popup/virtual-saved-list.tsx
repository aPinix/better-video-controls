import {
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const OVERSCAN = 3;

/** Window rows against the popup's full-width scroll viewport, including its intro. */
export function VirtualSavedList<T>({
  items,
  itemKey,
  renderItem,
  scrollRef,
  estimate,
  label,
}: {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, pin: (pinned: boolean) => void) => ReactNode;
  scrollRef: RefObject<HTMLDivElement | null>;
  estimate: number;
  label: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const heights = useRef(new Map<string, number>());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [measurement, setMeasurement] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });
  const [pinned, setPinned] = useState<Set<string>>(() => new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const keys = useMemo(() => items.map(itemKey), [items, itemKey]);
  const indexByKey = useMemo(
    () => new Map(keys.map((key, index) => [key, index])),
    [keys]
  );
  const layout = useMemo(() => {
    const offsets = [0];
    for (const key of keys)
      offsets.push(
        (offsets.at(-1) ?? 0) + (heights.current.get(key) ?? estimate)
      );
    return { offsets, total: offsets.at(-1) ?? 0, measurement };
  }, [keys, estimate, measurement]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const scroller =
      scrollRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      ) ?? list?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!list || !scroller) return;
    let frame = 0;
    const update = () => {
      const top =
        scroller.getBoundingClientRect().top - list.getBoundingClientRect().top;
      const height = scroller.clientHeight || 600;
      setViewport((current) =>
        current.top === top && current.height === height
          ? current
          : { top, height }
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(scroller);
    observer.observe(list);
    if (list.parentElement) observer.observe(list.parentElement);
    scroller.addEventListener('scroll', schedule, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener('scroll', schedule);
    };
  }, [scrollRef]);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const key = (entry.target as HTMLElement).dataset.virtualKey;
        const height =
          entry.borderBoxSize?.[0]?.blockSize ||
          entry.target.getBoundingClientRect().height;
        if (
          key &&
          height > 0 &&
          Math.abs((heights.current.get(key) ?? estimate) - height) >= 1
        ) {
          heights.current.set(key, height);
          changed = true;
        }
      }
      if (changed) setMeasurement((current) => current + 1);
    });
    observerRef.current = observer;
    for (const row of rows.current.values()) observer.observe(row);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [estimate]);

  const indices = useMemo(() => {
    // Binary search avoids walking the whole library on each scroll frame.
    const find = (position: number) => {
      let low = 0;
      let high = items.length;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if ((layout.offsets[middle + 1] ?? 0) <= position) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    const first = Math.max(0, find(viewport.top) - OVERSCAN);
    const last = Math.min(
      items.length,
      find(viewport.top + viewport.height) + OVERSCAN + 1
    );
    const visible = new Set(
      Array.from(
        { length: Math.max(0, last - first) },
        (_, index) => first + index
      )
    );
    for (const key of focused ? new Set([...pinned, focused]) : pinned) {
      const index = indexByKey.get(key);
      if (index !== undefined) visible.add(index);
    }
    return [...visible].sort((a, b) => a - b);
  }, [items.length, indexByKey, layout, viewport, pinned, focused]);

  return (
    <ul
      aria-label={label}
      className="relative"
      ref={listRef}
      style={{ height: layout.total }}
    >
      {indices.map((index) => {
        const item = items[index];
        const key = keys[index];
        if (item === undefined || key === undefined) return null;
        return (
          <li
            aria-posinset={index + 1}
            aria-setsize={items.length}
            className="absolute inset-x-0 top-0"
            data-virtual-key={key}
            key={key}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setFocused((current) => (current === key ? null : current));
            }}
            onFocusCapture={() => setFocused(key)}
            ref={(element) => {
              const previous = rows.current.get(key);
              if (previous) observerRef.current?.unobserve(previous);
              if (element) {
                rows.current.set(key, element);
                observerRef.current?.observe(element);
              } else rows.current.delete(key);
            }}
            style={{ transform: `translateY(${layout.offsets[index]}px)` }}
          >
            {renderItem(item, (keep) =>
              setPinned((current) => {
                if (current.has(key) === keep) return current;
                const next = new Set(current);
                if (keep) next.add(key);
                else next.delete(key);
                return next;
              })
            )}
          </li>
        );
      })}
    </ul>
  );
}
