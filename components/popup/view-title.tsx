interface ViewTitlePropsI {
  description: string;
  title: string;
}

export function ViewTitle({ description, title }: ViewTitlePropsI) {
  return (
    <header className="flex flex-col gap-1 px-1">
      <h1 className="text-xl leading-tight font-bold text-slate-950 dark:text-white">
        {title}
      </h1>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </header>
  );
}
