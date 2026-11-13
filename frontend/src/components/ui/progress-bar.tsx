import React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  min?: number;
  max?: number;
  label: string;
  showPercent?: boolean;
  valueText?: string;
}

/**
 * Accessible Progress Bar following WAI-ARIA guidelines:
 * role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax, aria-valuetext.
 */
export function ProgressBar({
  value,
  min = 0,
  max = 100,
  label,
  showPercent = true,
  valueText,
  className = '',
  ...props
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = Math.round(((clampedValue - min) / (max - min)) * 100);
  const formattedText = valueText || `${percentage}% completed`;

  return (
    <div className={`space-y-2 ${className}`} {...props}>
      <div className="flex justify-between items-center text-[var(--font-size-base)] font-bold">
        <span>{label}</span>
        {showPercent && <span aria-hidden="true">{percentage}%</span>}
      </div>

      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={formattedText}
        aria-label={label}
        className="w-full h-4 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-full overflow-hidden p-0.5"
      >
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
