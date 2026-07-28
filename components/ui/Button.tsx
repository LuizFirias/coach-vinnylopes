'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonVariant = 'primary' | 'primary-capsule' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-btn-primary text-text-on-brand shadow-btn-glow hover:shadow-btn-glow-hover hover:opacity-90 active:opacity-80',
  'primary-capsule':
    'bg-btn-primary text-text-on-brand shadow-btn-glow hover:shadow-btn-glow-hover hover:opacity-90 active:opacity-80 overflow-hidden p-0',
  secondary:
    'bg-surface-3 text-text-primary border border-border hover:bg-surface-2',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2',
  danger:
    'bg-danger-subtle text-danger border border-danger-border hover:bg-danger hover:text-text-primary',
  success:
    'bg-[#39c75a] text-text-on-brand shadow-none active:opacity-80',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg',
};

const capsuleSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 text-sm',
  md: 'h-12 text-base',
  lg: 'h-14 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  const isPrimaryCapsule = variant === 'primary-capsule';
  const capsuleIcon = !loading && leftIcon ? leftIcon : null;

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
        'transition-all duration-fast ease-out',
        'active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        loading && 'opacity-70 disabled:opacity-70',
        isPrimaryCapsule && 'relative justify-start gap-0 text-left',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        variantClasses[variant],
        isPrimaryCapsule ? capsuleSizeClasses[size] : sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {isPrimaryCapsule ? (
        <>
          <span className="flex h-full w-[52px] shrink-0 items-center justify-center bg-black/15">
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              capsuleIcon
            )}
          </span>
          <span className="flex-1 pr-[52px] text-center">{children}</span>
        </>
      ) : (
        <>
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            leftIcon
          )}
          {children}
          {!loading && rightIcon}
        </>
      )}
    </button>
  );
});
