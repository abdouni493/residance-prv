import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children?: ReactNode;
  hover?: boolean;
  className?: string;
}

export const GradientCard = forwardRef<HTMLDivElement, Props>(function GradientCard(
  { children, hover, className, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'glass rounded-2xl border border-slate-200 shadow-card',
        hover && 'cursor-pointer hover:border-brand-400/30 hover:shadow-glow transition-colors',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
  dark = false,
  style,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  style?: React.CSSProperties;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={style}
      className={cn(
        'rounded-2xl shadow-xl p-5',
        dark ? 'border border-white/10 text-white' : 'glass border border-slate-200',
        className,
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {icon && <span className={dark ? 'text-sky-300' : 'text-brand-400'}>{icon}</span>}
            {title && <h3 className={cn('font-semibold', dark ? 'text-white' : 'text-ink-primary')}>{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
