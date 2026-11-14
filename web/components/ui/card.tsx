import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  interactive?: boolean;
}

export function Card({
  as: Component = "div",
  interactive = false,
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text)] transition-shadow ${
        interactive
          ? "cursor-pointer hover:border-[var(--color-primary)] focus-within:outline focus-within:outline-3 focus-within:outline-[var(--color-focus)] focus-within:outline-offset-2"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-3 space-y-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  as: Component = "h3",
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return (
    <Component
      className={`text-xl font-bold tracking-tight text-[var(--color-text)] ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-[var(--font-size-base)] text-[var(--color-text-muted)] leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-6 pt-4 border-t border-[var(--color-border)] flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
