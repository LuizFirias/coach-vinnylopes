import { type ReactNode } from 'react';

interface ScreenHeaderProps {
  greeting?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function ScreenHeader({ greeting, title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="px-4 pt-6 pb-4">
      {greeting && (
        <p className="text-base text-text-secondary mb-1">{greeting}</p>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}
