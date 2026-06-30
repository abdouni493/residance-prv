/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: '#F1F5F9',
          card: '#FFFFFF',
          panel: '#F8FAFC',
        },
        ink: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0891b2 100%)',
        'grad-secondary': 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #4F46E5 100%)',
        'grad-success': 'linear-gradient(135deg, #34D399 0%, #10B981 55%, #059669 100%)',
        'grad-warning': 'linear-gradient(135deg, #FBBF24 0%, #FB7185 60%, #EF4444 100%)',
        'grad-gold': 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 55%, #D97706 100%)',
        'grad-rose': 'linear-gradient(135deg, #FB7185 0%, #F43F5E 50%, #E11D8F 100%)',
        'grad-teal': 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 55%, #0D9488 100%)',
        'grad-purple': 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #6D28D9 100%)',
        'grad-cyan': 'linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)',
      },
      boxShadow: {
        glow: '0 10px 26px -6px rgba(29,78,216,0.35)',
        'glow-lg': '0 16px 40px -8px rgba(30,58,138,0.4)',
        card: '0 8px 30px rgba(2,6,23,0.08)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
