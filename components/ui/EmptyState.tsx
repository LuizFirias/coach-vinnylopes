import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: ReactNode;
  hint?: string;
}

export function EmptyState({ icon: Icon, title, description, cta, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-text-tertiary" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">{description}</p>
      {cta && <div className="mb-4">{cta}</div>}
      {hint && <p className="text-xs text-text-tertiary max-w-xs">💡 {hint}</p>}
    </div>
  );
}
