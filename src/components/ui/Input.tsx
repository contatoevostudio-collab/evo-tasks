import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

// ─── Label ──────────────────────────────────────────────────────────────────

interface FieldLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

export function FieldLabel({ children, required }: FieldLabelProps) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        marginBottom: 6,
      }}
    >
      {children}
      {required && <span style={{ color: '#ff453a', marginLeft: 4 }}>*</span>}
    </label>
  );
}

// ─── Helper / Error ─────────────────────────────────────────────────────────

interface FieldHintProps {
  children: React.ReactNode;
  type?: 'helper' | 'error' | 'success';
}

export function FieldHint({ children, type = 'helper' }: FieldHintProps) {
  const color =
    type === 'error' ? '#ff453a'
    : type === 'success' ? '#30d158'
    : 'var(--t4)';
  return (
    <div style={{ fontSize: 11, color, marginTop: 6 }}>
      {children}
    </div>
  );
}

// ─── Shared field wrapper ────────────────────────────────────────────────────

interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
}

/**
 * Envelope reusável que combina label + campo + helper/error.
 * Uso:
 *   <Field label="Nome" required helper="Como aparece no cartão">
 *     <TextInput value={x} onChange={setX} />
 *   </Field>
 */
export function Field({ label, required, helper, error, success, children }: FieldWrapperProps) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      {children}
      {error && <FieldHint type="error">{error}</FieldHint>}
      {!error && success && <FieldHint type="success">{success}</FieldHint>}
      {!error && !success && helper && <FieldHint>{helper}</FieldHint>}
    </div>
  );
}

// ─── TextInput ──────────────────────────────────────────────────────────────

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { value, onChange, invalid, success, leftIcon, rightIcon, style, ...rest }, ref,
) {
  const borderColor = invalid ? '#ff453a' : success ? '#30d158' : 'var(--b2)';
  const focusRing = invalid ? 'rgba(255,69,58,0.18)' : success ? 'rgba(48,209,88,0.18)' : 'var(--b3)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--ib)',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: '9px 12px',
        transition: 'border-color .12s, box-shadow .12s',
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = invalid ? '#ff453a' : success ? '#30d158' : 'var(--b3)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 3px ${focusRing}`;
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = borderColor;
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {leftIcon && <span style={{ display: 'flex', color: 'var(--t4)', flexShrink: 0 }}>{leftIcon}</span>}
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--t1)',
          fontSize: 13,
          minWidth: 0,
          ...style,
        }}
        {...rest}
      />
      {rightIcon && <span style={{ display: 'flex', color: 'var(--t4)', flexShrink: 0 }}>{rightIcon}</span>}
    </div>
  );
});

// ─── Textarea ───────────────────────────────────────────────────────────────

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { value, onChange, invalid, rows = 3, style, ...rest }, ref,
) {
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      style={{
        width: '100%',
        background: 'var(--ib)',
        border: `1px solid ${invalid ? '#ff453a' : 'var(--b2)'}`,
        borderRadius: 8,
        padding: '9px 12px',
        color: 'var(--t1)',
        fontSize: 13,
        outline: 'none',
        resize: 'vertical',
        minHeight: 72,
        fontFamily: 'inherit',
        lineHeight: 1.4,
        transition: 'border-color .12s',
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = invalid ? '#ff453a' : 'var(--b3)';
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = invalid ? '#ff453a' : 'var(--b2)';
      }}
      {...rest}
    />
  );
});
