import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type CardVariant = 'default' | 'primary' | 'interactive';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
}

const cardVariants: Record<CardVariant, string> = {
  default: 'bg-surface-1 border border-border',
  primary: 'bg-surface-2 border border-brand-border shadow-glow-brand',
  interactive:
    'bg-surface-1 border border-border cursor-pointer transition-all duration-fast ease-out hover:bg-surface-2 active:scale-[0.99]',
};

export function Card({ variant = 'default', className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-lg p-4', cardVariants[variant], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
