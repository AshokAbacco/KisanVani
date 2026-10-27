import { forwardRef, useId } from 'react';

/** Label + control + hint/error. Children receive no props; use the Input/Select/Textarea below for wiring. */
export const Field = ({ label, error, hint, required, children, className = '', htmlFor }) => (
  <div className={className}>
    {label && (
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="text-red-600" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
    )}
    {children}
    {error ? (
      <p className="mt-1 text-sm text-red-600" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p className="mt-1 text-xs text-soil-500">{hint}</p>
    ) : null}
  </div>
);

export const Input = forwardRef(function Input({ label, error, hint, required, className = '', inputClass = '', suffix, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <div className="relative">
        <input id={id} ref={ref} className={`input ${error ? 'input-error' : ''} ${suffix ? 'pr-12' : ''} ${inputClass}`} aria-invalid={!!error} {...rest} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-soil-400">{suffix}</span>}
      </div>
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, options = [], placeholder, className = '', ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <select id={id} ref={ref} className={`input ${error ? 'input-error' : ''}`} aria-invalid={!!error} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className = '', rows = 3, ...rest }, ref) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <textarea id={id} ref={ref} rows={rows} className={`input ${error ? 'input-error' : ''}`} aria-invalid={!!error} {...rest} />
    </Field>
  );
});

export default Field;
