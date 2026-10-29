import { Collapsible } from '@base-ui/react/collapsible';
import type { ReactNode } from 'react';

export function SettingsExpansion({
  open,
  children,
  error,
}: {
  open: boolean;
  children: ReactNode;
  error?: string;
}) {
  return (
    <>
      <Collapsible.Root open={open}>
        <Collapsible.Panel
          aria-hidden={!open || undefined}
          className="h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0 motion-reduce:transition-none"
          data-slot="settings-expansion"
          inert={!open}
        >
          <div className="pt-4">{children}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
      {error && (
        <p className="mt-3 text-red-600 text-xs" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
