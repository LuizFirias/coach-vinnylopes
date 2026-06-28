'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, className, id, ...rest },
  ref
) {
  const inputId = id || rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 w-full rounded-md px-3 text-xs',
          'bg-surface-2 border border-border-subtle text-text-primary',
          'placeholder:text-text-disabled',
          'transition-all duration-fast ease-out',
          'focus:outline-none focus:border-brand/40 focus:shadow-focus-ring',
          error && 'border-danger',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
        }
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-text-tertiary">
          {helperText}
        </p>
      )}
    </div>
  );
});
