'use client';

import React from 'react';

export interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetId?: string;
  children?: React.ReactNode;
}

/**
 * SkipLink is the first focusable element on any page, allowing keyboard
 * and screen reader users to skip repeated navigation blocks directly to main content.
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
  className = '',
  onClick,
  ...props
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`skip-link absolute top-2 left-2 z-[9999] px-4 py-3 bg-[var(--color-bg)] text-[var(--color-text)] border-2 border-[var(--color-primary)] font-bold rounded shadow-lg transform -translate-y-24 focus:translate-y-0 transition-transform duration-150 inline-flex items-center min-h-[44px] min-w-[44px] focus:outline focus:outline-3 focus:outline-[var(--color-focus)] focus:outline-offset-2 ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
