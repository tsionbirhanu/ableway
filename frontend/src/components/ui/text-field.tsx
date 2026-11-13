'use client';

import React, { useId } from 'react';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, required = false, id: providedId, className = '', ...props }, ref) => {
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

        <input
          ref={ref}
          id={id}
          required={required}
          aria-required={required ? 'true' : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-base min-h-[44px] transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-slate-600 focus:ring-emerald-500'
          } ${className}`}
          {...props}
        />

        {error && (
          <p id={errorId} className="text-xs text-red-300 font-medium pt-0.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';
