'use client';

import React from 'react';

export interface LiveRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: 'polite' | 'assertive' | 'off';
  role?: 'status' | 'alert' | 'log';
  atomic?: boolean;
  message?: string;
  children?: React.ReactNode;
}

/**
 * LiveRegion component announces dynamic content updates to screen reader users
 * without disrupting ongoing reading unless urgent (assertive).
 */
export function LiveRegion({
  mode = 'polite',
  role = mode === 'assertive' ? 'alert' : 'status',
  atomic = true,
  message,
  children,
  className = '',
  ...props
}: LiveRegionProps) {
  return (
    <div
      role={role}
      aria-live={mode}
      aria-atomic={atomic}
      aria-relevant="additions text"
      className={`sr-only ${className}`}
      {...props}
    >
      {message ?? children}
    </div>
  );
}

