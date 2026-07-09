interface NutritionPageHeaderProps {
  dateLabel: string;
  isDesktop?: boolean;
  className?: string;
}

export function NutritionPageHeader({
  dateLabel,
  isDesktop = false,
  className,
}: NutritionPageHeaderProps) {
  return (
    <header className={className}>
      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted capitalize">
        {dateLabel}
      </p>
      <h1
        className={
          isDesktop
            ? "text-[22px] font-extrabold text-text-primary mt-1"
            : "text-[22px] font-extrabold text-text-primary mt-0.5"
        }
      >
        Nutrição
      </h1>
    </header>
  );
}
