import React from 'react';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  severity?: AlertSeverity;
  title?: string;
  children: React.ReactNode;
}

const severityConfig: Record<
  AlertSeverity,
  {
    role: 'alert' | 'status';
    iconText: string;
    badgeText: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
  }
> = {
  info: {
    role: 'status',
    iconText: 'ℹ️',
    badgeText: 'Information:',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-950/20',
    textColor: 'text-[var(--color-text)]',
  },
  warning: {
    role: 'alert',
    iconText: '⚠️',
    badgeText: 'Warning:',
    borderColor: 'border-yellow-400',
    bgColor: 'bg-yellow-950/20',
    textColor: 'text-[var(--color-text)]',
  },
  error: {
    role: 'alert',
    iconText: '⛔',
    badgeText: 'Error:',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-950/25',
    textColor: 'text-[var(--color-text)]',
  },
  success: {
    role: 'status',
    iconText: '✅',
    badgeText: 'Success:',
    borderColor: 'border-emerald-400',
    bgColor: 'bg-emerald-950/20',
    textColor: 'text-[var(--color-text)]',
  },
};

/**
 * Accessible Alert banner. Never relies on color alone — uses distinct textual prefixes
 * and emoji/SVG indicators with role="alert" or role="status".
 */
export function Alert({
  severity = 'info',
  title,
  children,
  className = '',
  ...props
}: AlertProps) {
  const config = severityConfig[severity];

  return (
    <div
      role={config.role}
      className={`rounded-lg border-2 p-4 text-[var(--font-size-base)] leading-relaxed ${config.borderColor} ${config.bgColor} ${config.textColor} ${className}`}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-xl select-none">
          {config.iconText}
        </span>
        <div className="flex-1 space-y-1">
          {title && (
            <p className="font-bold">
              <span className="sr-only">{config.badgeText} </span>
              {title}
            </p>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

