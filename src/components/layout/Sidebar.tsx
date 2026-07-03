import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Building2, ChevronRight } from 'lucide-react';
import { NAV_ITEMS } from './navConfig';
import { GRADIENT_CLASS } from '@/design-tokens';
import { useApp, useCurrentPermissions, canAccess } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { sidebarItemVariant, staggerFast } from '@/animations';
import { cn } from '@/lib/utils';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const storeInfo = useApp((s) => s.storeInfo);
  const logout = useApp((s) => s.logout);
  const perms = useCurrentPermissions();

  const items = useMemo(() => NAV_ITEMS.filter((i) => canAccess(perms, i.module)), [perms]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-white/80 backdrop-blur-xl border-e border-slate-200">
      {/* Logo / brand */}
      <div className="flex items-center gap-3 px-5 h-[68px] border-b border-slate-200 shrink-0">
        <motion.div
          initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          className="grid h-10 w-10 place-items-center rounded-xl bg-grad-primary text-white shadow-glow shrink-0 overflow-hidden"
        >
          {storeInfo.logo ? (
            <img src={storeInfo.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 size={22} />
          )}
        </motion.div>
        <div className="min-w-0">
          <p className="font-bold text-ink-primary text-sm leading-tight truncate">
            {storeInfo.name}
          </p>
          <p className="text-[11px] text-ink-muted truncate">{t('app.tagline')}</p>
        </div>
      </div>

      {/* Nav */}
      <motion.nav
        variants={staggerFast}
        initial="initial"
        animate="animate"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.module}
              variants={sidebarItemVariant}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-ink-primary'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-100',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="active-nav"
                        className="absolute inset-0 rounded-xl bg-brand-50 ring-1 ring-brand-200 -z-10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    {/* colored icon chip */}
                    <span
                      className={cn(
                        'grid place-items-center h-8 w-8 rounded-lg shrink-0 transition-all',
                        isActive
                          ? cn(GRADIENT_CLASS[item.color], 'text-white shadow-glow')
                          : 'bg-slate-100 text-ink-secondary group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm',
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="truncate flex-1">{t(item.labelKey)}</span>
                    <ChevronRight
                      size={15}
                      className={cn(
                        'shrink-0 transition-all',
                        isActive
                          ? 'text-brand-500 opacity-100'
                          : 'text-ink-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-200 shrink-0">
        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-rose-50 text-rose-500 shrink-0">
            <LogOut size={18} />
          </span>
          {t('nav.logout')}
        </motion.button>
      </div>
    </div>
  );
}
