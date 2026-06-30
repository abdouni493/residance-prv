export const COLORS = {
  // Sky-blue brand palette
  brand: {
    50: '#f0f4ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#1d4ed8',
    600: '#1e3a8a',
    700: '#1d40b0',
    800: '#1e3e96',
    900: '#172554',
  },

  // Dégradés principaux
  primary: { from: '#1e3a8a', to: '#0891b2' }, // SaaS Indigo -> Cyan
  secondary: { from: '#1e3a8a', to: '#4f46e5' }, // SaaS Indigo -> Royal Blue
  success: { from: '#10B981', to: '#059669' }, // Émeraude → Vert
  warning: { from: '#F59E0B', to: '#EF4444' }, // Ambre → Rouge
  gold: { from: '#F59E0B', to: '#D97706' }, // Or luxe
  rose: { from: '#F43F5E', to: '#EC4899' }, // Rose → Fuchsia

  // Surfaces (light mode)
  bgDark: '#F1F5F9',
  bgCard: '#FFFFFF',
  bgPanel: '#F8FAFC',
  bgGlass: 'rgba(255,255,255,0.72)',
  border: 'rgba(15,23,42,0.06)',

  // Texte
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
};

export type GradientKey =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'gold'
  | 'rose'
  | 'teal'
  | 'purple'
  | 'cyan';

// Tailwind background-image class names declared in tailwind.config.js
export const GRADIENT_CLASS: Record<GradientKey, string> = {
  primary: 'bg-grad-primary',
  secondary: 'bg-grad-secondary',
  success: 'bg-grad-success',
  warning: 'bg-grad-warning',
  gold: 'bg-grad-gold',
  rose: 'bg-grad-rose',
  teal: 'bg-grad-teal',
  purple: 'bg-grad-purple',
  cyan: 'bg-grad-cyan',
};

// Raw CSS gradients (for inline styles / charts)
export const GRADIENT_CSS: Record<GradientKey, string> = {
  primary: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0891b2 100%)',
  secondary: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #4F46E5 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  gold: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  rose: 'linear-gradient(135deg, #F43F5E 0%, #EC4899 100%)',
  teal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  purple: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  cyan: 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)',
};

export const CHART_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#22D3EE',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
];
