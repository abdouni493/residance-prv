import {
  LayoutGrid,
  CalendarHeart,
  Building2,
  Sparkles,
  UsersRound,
  HardHat,
  ReceiptText,
  Wallet,
  ChartColumnBig,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from '@/types';
import type { GradientKey } from '@/design-tokens';

export interface NavItem {
  module: ModuleKey;
  path: string;
  labelKey: string;
  icon: LucideIcon;
  color: GradientKey;
}

export const NAV_ITEMS: NavItem[] = [
  { module: 'dashboard', path: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutGrid, color: 'primary' },
  { module: 'reservations', path: '/app/reservations', labelKey: 'nav.reservations', icon: CalendarHeart, color: 'purple' },
  { module: 'chambres', path: '/app/chambres', labelKey: 'nav.appartements', icon: Building2, color: 'secondary' },
  { module: 'services', path: '/app/services', labelKey: 'nav.services', icon: Sparkles, color: 'gold' },
  { module: 'clients', path: '/app/clients', labelKey: 'nav.clients', icon: UsersRound, color: 'rose' },
  { module: 'workers', path: '/app/workers', labelKey: 'nav.workers', icon: HardHat, color: 'teal' },
  { module: 'expenses', path: '/app/expenses', labelKey: 'nav.expenses', icon: ReceiptText, color: 'warning' },
  { module: 'caisse', path: '/app/caisse', labelKey: 'nav.caisse', icon: Wallet, color: 'success' },
  { module: 'reports', path: '/app/reports', labelKey: 'nav.reports', icon: ChartColumnBig, color: 'cyan' },
  { module: 'settings', path: '/app/settings', labelKey: 'nav.settings', icon: Settings2, color: 'primary' },
];
