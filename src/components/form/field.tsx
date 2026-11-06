import type { ComponentProps, ReactNode } from "react";

type LabelledProps = {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  required?: boolean;
};

type Props = ComponentProps<"input"> & LabelledProps;

type SelectProps = ComponentProps<"select"> &
  LabelledProps & {
    placeholder: string;
    options: readonly string[];
  };

// Label, control and hint; className goes on the wrapper so it can span grid columns
function Labelled({
  id,
  label,
  hint,
  className = "",
  required,
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
    </div>
  );
}

// Labelled text input
export function Field({ id, label, hint, className, required, ...props }: Props) {
  return (
    <Labelled id={id} label={label} hint={hint} className={className} required={required}>
      <input
        id={id}
        name={id}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="input"
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
  placeholder,
  options,
  defaultValue = "",
  ...props
}: SelectProps) {
  return (
    <Labelled id={id} label={label} hint={hint} className={className} required={required}>
      <select
        id={id}
        name={id}
        required={required}
        defaultValue={defaultValue}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="input cursor-pointer"
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Labelled>
  );
}
