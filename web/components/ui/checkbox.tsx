"use client";

import React, { useId } from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, hint, error, required = false, id: providedId, className = "", ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
      <div className="space-y-1">
        <label
          htmlFor={id}
          className="flex items-start gap-3 cursor-pointer min-h-[44px] py-1 text-slate-100"
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            required={required}
            aria-required={required ? "true" : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={`w-5 h-5 mt-0.5 rounded text-emerald-600 bg-slate-950 border-slate-600 focus:ring-emerald-500 ${className}`}
            {...props}
          />
          <div className="space-y-0.5">
            <span className="text-sm font-bold block">
              {label}{" "}
              {required ? <span className="text-emerald-400 font-semibold">(required)</span> : null}
            </span>
            {hint && (
              <span id={hintId} className="text-xs text-slate-300 block">
                {hint}
              </span>
            )}
          </div>
        </label>

        {error && (
          <p id={errorId} className="text-xs text-red-300 font-medium pl-8" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
