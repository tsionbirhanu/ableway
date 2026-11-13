import React from 'react';

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: LinkButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl min-h-[44px] min-w-[44px] transition-colors focus:outline-none focus:ring-4';

  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-300',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 focus:ring-emerald-400',
    danger: 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-400',
    outline: 'bg-transparent border-2 border-slate-600 hover:bg-slate-800 text-slate-100 focus:ring-emerald-400',
  };

  const sizeStyles = {
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <a
      href={href}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}
