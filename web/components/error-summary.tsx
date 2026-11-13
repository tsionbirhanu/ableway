"use client";

import { useEffect, useRef } from "react";

type ErrorSummaryProps = {
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Field ids, so each error links to its field. */
  fieldIds?: Record<string, string>;
};

/**
 * Shown after a failed submit. It takes focus so screen readers announce it
 * at once, and each item links to the field that needs fixing.
 */
export function ErrorSummary({ message, fieldErrors = {}, fieldIds = {} }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(fieldErrors);

  useEffect(() => {
    ref.current?.focus();
  }, [message, fieldErrors]);

  if (!message && entries.length === 0) return null;

  return (
    <div ref={ref} className="error-summary" role="alert" tabIndex={-1}>
      <h2>{message ?? "Please check the form."}</h2>
      {entries.length > 0 ? (
        <ul>
          {entries.map(([field, error]) => (
            <li key={field}>
              <a href={`#${fieldIds[field] ?? field}`}>{error}</a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
