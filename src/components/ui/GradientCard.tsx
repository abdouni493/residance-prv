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
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass rounded-2xl border border-slate-200 shadow-card p-5', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-brand-400">{icon}</span>}
            {title && <h3 className="font-semibold text-ink-primary">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
