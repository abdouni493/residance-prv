import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useI18n();
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={toggleLang}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl glass border border-slate-200 px-3 h-10 text-sm font-semibold text-ink-primary hover:bg-slate-200/70 transition-colors focus-ring',
        className,
      )}
      aria-label="Changer la langue"
    >
      <Languages size={18} className="text-brand-400" />
      <span className={cn(lang === 'fr' && 'text-gradient')}>FR</span>
      <span className="text-ink-muted">/</span>
      <span className={cn('font-arabic', lang === 'ar' && 'text-gradient')}>عربي</span>
    </motion.button>
  );
}
