'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, children, className = '', disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-xl min-h-[44px] min-w-[44px] transition-colors focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-orange-500 hover:bg-orange-400 text-white shadow-sm focus:ring-orange-400',
      secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 shadow-sm focus:ring-orange-400',
      danger: 'bg-red-700 hover:bg-red-600 text-white shadow-sm focus:ring-red-400',
      outline: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm focus:ring-orange-400',
      ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-100 focus:ring-orange-400',
    };

    const sizeStyles = {
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? 'true' : undefined}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
