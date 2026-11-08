import type { ComponentProps, ReactNode } from "react";

type LabelledProps = {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  required?: boolean;
  error?: string;
};

type Props = ComponentProps<"input"> & LabelledProps;

type SelectProps = ComponentProps<"select"> &
  LabelledProps & {
    placeholder: string;
    options: readonly (string | { value: string; label: string })[];
  };

type TextareaProps = ComponentProps<"textarea"> & LabelledProps;

// The ids a control points at for its hint and error
function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

// Label, control, hint and error; className goes on the wrapper so it can span grid columns
function Labelled({
  id,
  label,
  hint,
  className = "",
  required,
  error,
  children,
}: LabelledProps & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-caption text-muted uppercase">
        {label}
        {!required && <span className="normal-case"> (optional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-caption text-error">
          {error}
        </p>
      )}
    </div>
  );
}

// Labelled text input
export function Field({ id, label, hint, className, required, error, ...props }: Props) {
  return (
    <Labelled id={id} label={label} hint={hint} className={className} required={required} error={error}>
      <input
        id={id}
        name={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="input"
        {...props}
      />
    </Labelled>
  );
}

// Labelled multi-line input
export function TextareaField({ id, label, hint, className, required, error, ...props }: TextareaProps) {
  return (
    <Labelled id={id} label={label} hint={hint} className={className} required={required} error={error}>
      <textarea
        id={id}
        name={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="input h-auto resize-y py-3"
        {...props}
      />
    </Labelled>
  );
}

// Labelled native select; the empty placeholder option makes `required` work
export function SelectField({
  id,
  label,
  hint,
  className,
  required,
  error,
  placeholder,
  options,
  defaultValue = "",
  ...props
}: SelectProps) {
  return (
    <Labelled id={id} label={label} hint={hint} className={className} required={required} error={error}>
      <select
        id={id}
        name={id}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className="input cursor-pointer"
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => {
          const { value, label: text } =
            typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Labelled>
  );
}
