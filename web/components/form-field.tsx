import type { InputHTMLAttributes } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  /** Short help read after the label. */
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-describedby" | "aria-invalid">;

/**
 * Labelled input with an optional hint and error. The hint and error are
 * linked with aria-describedby, so screen readers read them with the field.
 */
export function FormField({ id, label, hint, error, ...input }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...input}
      />
    </div>
  );
}
