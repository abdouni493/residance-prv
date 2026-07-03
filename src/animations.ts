import type { Variants } from 'framer-motion';

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.25, ease: easeOut } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.07 } },
};

export const staggerFast: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 48 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 280, damping: 26 },
  },
  exit: { opacity: 0, x: 48, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.2 } },
};

export const sidebarItemVariant: Variants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
};

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeOut } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

// Modal overlay + panel
export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanel: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.94, y: 20, transition: { duration: 0.18 } },
};

// Drawer (slides from the side)
export const drawerPanel: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '100%', transition: { duration: 0.25 } },
};

export const drawerPanelLeft: Variants = {
  initial: { x: '-100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: '-100%', transition: { duration: 0.25 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: easeOut } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } },
};
