import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ItemRowTextPropsI {
  className?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  title: ReactNode;
  titleClassName?: string;
  titleTooltip?: string;
}

export function ItemRowText({
  className,
  description,
  descriptionClassName,
  title,
  titleClassName,
  titleTooltip,
}: ItemRowTextPropsI) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <span
        className={cn(
          'truncate text-sm font-medium text-slate-900 dark:text-white',
          titleClassName
        )}
        title={titleTooltip}
      >
        {title}
      </span>
      {description ? (
        <div
          className={cn(
            'text-xs leading-snug break-words whitespace-normal text-muted-foreground',
            descriptionClassName
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}
