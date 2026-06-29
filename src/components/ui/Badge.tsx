import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple' | 'active';

const tones: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-600 border-emerald-400/30',
  danger: 'bg-rose-500/15 text-rose-600 border-rose-400/30',
  warning: 'bg-amber-500/15 text-amber-600 border-amber-400/30',
  info: 'bg-sky-500/15 text-sky-600 border-sky-400/30',
  neutral: 'bg-slate-100 text-ink-secondary border-slate-200',
  purple: 'bg-violet-500/15 text-violet-600 border-violet-400/30',
  active: 'bg-brand-500/15 text-brand-700 border-brand-400/30',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
