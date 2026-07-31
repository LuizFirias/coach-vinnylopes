interface NutritionPageHeaderProps {
  /** Ex.: "segunda" */
  weekday?: string;
  /** Ex.: "31 de julho" */
  datePart?: string;
  /** Fallback legado — string completa */
  dateLabel?: string;
  isDesktop?: boolean;
  className?: string;
}

export function NutritionPageHeader({
  weekday,
  datePart,
  dateLabel,
  isDesktop = false,
  className,
}: NutritionPageHeaderProps) {
  return (
    <header className={className}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary">
        {weekday && datePart ? (
          <>
            {weekday},{" "}
            <span className="text-brand">{datePart}</span>
          </>
        ) : (
          <span className="capitalize">{dateLabel}</span>
        )}
      </p>
      <h1
        className={
          isDesktop
            ? "mt-1 text-[28px] font-black tracking-tight text-text-primary"
            : "mt-0.5 text-[28px] font-black tracking-tight text-text-primary"
        }
      >
        Nutrição
      </h1>
    </header>
  );
}
