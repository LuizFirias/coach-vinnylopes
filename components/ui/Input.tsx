'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Classe extra pro label — ex: reduzir o peso da fonte em algum contexto específico */
  labelClassName?: string;
  helperText?: string;
  error?: string;
  /** Ícone à esquerda do input (ex: Search) */
  leftIcon?: ReactNode;
  /** Elemento à direita do input (ex: unidade "kg", botão de limpar) */
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, labelClassName, helperText, error, className, id, leftIcon, rightElement, ...rest },
  ref
) {
  const inputId = id || rest.name;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.08em] text-text-tertiary dark:text-[#4a5568]",
            labelClassName,
          )}
        >
          {label}
        </label>
      )}

      {/* Wrapper — permite ícones laterais */}
      <div className="relative flex items-center">
        {/* Ícone esquerdo */}
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 z-[1] flex h-11 w-5 items-center justify-center text-text-disabled [&_svg]:h-4 [&_svg]:w-4">
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
            leftIcon && 'pl-9 has-left-icon',
            rightElement && 'pr-10 has-right-element',
            'text-[16px] font-normal text-text-primary dark:text-[#D8DCE6]',
            'placeholder:text-text-disabled placeholder:font-normal placeholder:text-[12px] dark:placeholder:text-[#4a5568]',
            'rounded-[10px]',
            'bg-white dark:bg-[#0d1117]',
            'border border-[#e4e4e7] dark:border-[#2d3748]',
            'transition-all duration-150',
            'focus:outline-none',
            'focus:border-brand dark:focus:border-[#9333ea]',
            'focus:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]',
            error && 'ring-1 ring-danger/40 focus:ring-danger/40',
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
