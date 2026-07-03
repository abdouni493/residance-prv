import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const baseInput =
  'w-full h-11 rounded-xl bg-slate-100/70 border border-slate-200 px-3.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none transition-all focus:border-brand-400/60 focus:bg-slate-100 focus:ring-2 focus:ring-brand-500/20';

export function Label({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-secondary mb-1.5">
      {children}
      {required && <span className="text-rose-600 ms-0.5">*</span>}
    </label>
  );
}

interface FieldWrapProps {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FieldWrap({ label, required, error, children, className }: FieldWrapProps) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  icon?: ReactNode;
  wrapClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, required, error, icon, className, wrapClassName, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} required={required} error={error} className={wrapClassName}>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 start-3 grid place-items-center text-ink-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(baseInput, icon && 'ps-10', error && 'border-rose-400/60', className)}
          {...rest}
        />
      </div>
    </FieldWrap>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  wrapClassName?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, required, error, className, wrapClassName, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} required={required} error={error} className={wrapClassName}>
      <textarea
        ref={ref}
        className={cn(baseInput, 'h-auto min-h-[80px] py-2.5 resize-y', error && 'border-rose-400/60', className)}
        {...rest}
      />
    </FieldWrap>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  wrapClassName?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, required, error, className, wrapClassName, children, ...rest },
  ref,
) {
  return (
    <FieldWrap label={label} required={required} error={error} className={wrapClassName}>
      <select
        ref={ref}
        className={cn(
          baseInput,
          'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%2394A3B8%27><path stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/></svg>")] bg-[length:18px] bg-no-repeat bg-[right_0.75rem_center] pe-10 [&>option]:bg-bg-card',
          error && 'border-rose-400/60',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  );
});

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 group"
    >
      <span
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-grad-primary' : 'bg-slate-200',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md',
            checked ? 'start-[1.375rem]' : 'start-0.5',
          )}
        />
      </span>
      {label && <span className="text-sm text-ink-primary">{label}</span>}
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-start">
      <motion.span
        whileTap={{ scale: 0.85 }}
        className={cn(
          'grid place-items-center h-5 w-5 rounded-md border transition-colors shrink-0',
          checked ? 'bg-grad-primary border-transparent' : 'border-slate-300 bg-slate-100/70',
        )}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </motion.span>
      {label && <span className="text-sm text-ink-primary">{label}</span>}
    </button>
  );
}

export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3.5 h-10 text-sm transition-all',
            value === o.value
              ? 'border-brand-400/60 bg-brand-500/15 text-ink-primary'
              : 'border-slate-200 bg-slate-100/70 text-ink-secondary hover:bg-slate-100',
          )}
        >
          <span
            className={cn(
              'h-4 w-4 rounded-full border-2 grid place-items-center',
              value === o.value ? 'border-brand-400' : 'border-slate-300',
            )}
          >
            {value === o.value && <span className="h-2 w-2 rounded-full bg-brand-400" />}
          </span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'sm' | 'md';
}) {
  const groupId = useId();
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/70 border border-slate-200 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'relative rounded-lg font-medium transition-colors',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
            value === o.value ? 'text-white' : 'text-ink-secondary hover:text-ink-primary',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${groupId}`}
              className="absolute inset-0 rounded-lg bg-grad-primary shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
