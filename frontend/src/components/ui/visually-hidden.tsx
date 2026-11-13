import React from 'react';

export interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  children: React.ReactNode;
}

/**
 * VisuallyHidden hides elements visually while keeping them readable by screen readers.
 * Uses the proven CSS clip-rect / sr-only pattern.
 */
export function VisuallyHidden({
  as: Component = 'span',
  children,
  className = '',
  ...props
}: VisuallyHiddenProps) {
  return (
    <Component
      className={`sr-only ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

