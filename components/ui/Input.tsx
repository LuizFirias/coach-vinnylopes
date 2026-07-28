'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  /** Ícone à esquerda do input (ex: Search) */
  leftIcon?: ReactNode;
  /** Elemento à direita do input (ex: unidade "kg", botão de limpar) */
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, className, id, leftIcon, rightElement, ...rest },
  ref
) {
  const inputId = id || rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary"
        >
          {label}
        </label>
      )}

      {/* Wrapper — permite ícones laterais */}
      <div className="relative flex items-center">
        {/* Ícone esquerdo */}
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-text-disabled">
            {leftIcon}
          </span>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 w-full',
            'px-3.5',
            leftIcon && 'pl-9',
            rightElement && 'pr-10',
            'text-[16px] font-medium text-text-primary',
            'placeholder:text-text-disabled placeholder:font-normal',
            'rounded-[10px]',
            'bg-surface-2',
            'border border-input',
            'transition-all duration-150',
            'focus:outline-none',
            'focus:border-brand',
            'focus:ring-1 focus:ring-brand/30',
            error && 'border-danger focus:border-danger focus:ring-danger/30',
            className
          )}
          style={{ fontSize: '16px', touchAction: 'manipulation' }}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
              ? `${inputId}-helper`
              : undefined
          }
          {...rest}
        />

        {/* Elemento direito */}
        {rightElement && (
          <span className="absolute right-3 flex items-center text-text-tertiary">
            {rightElement}
          </span>
        )}
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-[12px] text-danger leading-tight"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p
          id={`${inputId}-helper`}
          className="text-[12px] text-text-tertiary leading-tight"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});
