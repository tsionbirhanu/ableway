'use client';

import React, { useId } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  hint?: string;
  description?: string;
}

export interface RadioGroupProps {
  legend: string;
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  hint,
  required = false,
}: RadioGroupProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  return (
    <fieldset className="space-y-3 border-0 p-0 m-0">
      <legend className="text-sm font-bold text-slate-100">
        {legend} {required ? <span className="text-emerald-400 font-semibold">(required)</span> : null}
      </legend>

      {hint && (
        <p id={hintId} className="text-xs text-slate-300">
          {hint}
        </p>
      )}

      <div className="space-y-2">
        {options.map((opt) => {
          const optId = `${name}-${opt.value}`;
          const isChecked = value === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={`flex items-start gap-3 p-3.5 rounded-xl border min-h-[44px] cursor-pointer transition-colors ${
                isChecked
                  ? 'bg-emerald-950/80 border-emerald-500 text-white'
                  : 'bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-600'
              }`}
            >
              <input
                id={optId}
                type="radio"
                name={name}
                value={opt.value}
                checked={isChecked}
                onChange={() => onChange(opt.value)}
                className="w-5 h-5 mt-0.5 text-emerald-600 bg-slate-900 border-slate-600 focus:ring-emerald-500"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-bold block">{opt.label}</span>
                {(opt.hint || opt.description) && (
                  <span className="text-xs text-slate-300 block">{opt.hint || opt.description}</span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-red-300 font-medium pt-0.5" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
