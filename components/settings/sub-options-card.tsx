import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const SUB_OPTIONS_CARD_CLASS_NAME =
  'ml-8 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/40';

export function SubOptionsCard({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(SUB_OPTIONS_CARD_CLASS_NAME, className)}
      data-slot="settings-sub-options"
      {...props}
    />
  );
}
