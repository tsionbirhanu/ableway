'use client';

import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: SelectOption[];
  hint?: string;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, options, hint, error, required = false, id: providedId, className = '', children, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-1.5 w-full">
        <label htmlFor={id} className="block text-sm font-bold text-slate-100">
          {label} {required ? <span className="text-emerald-400 font-semibold">(required)</span> : null}
        </label>

        {hint && (
          <p id={hintId} className="text-xs text-slate-300">
            {hint}
          </p>
        )}

        <select
          ref={ref}
          id={id}
          required={required}
          aria-required={required ? 'true' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-base min-h-[44px] focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-600 focus:ring-emerald-500'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {error && (
          <p id={errorId} className="text-xs text-red-300 font-medium pt-0.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

