import { lazy, Suspense, type ReactNode, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp, useCurrentPermissions, canAccess } from '@/store/appStore';
import { supabase } from '@/lib/supabase';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { pageTransition } from '@/animations';
import type { ModuleKey } from '@/types';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Reservations = lazy(() => import('@/pages/Reservations'));
const Chambres = lazy(() => import('@/pages/Chambres'));
const Services = lazy(() => import('@/pages/Services'));
const Clients = lazy(() => import('@/pages/Clients'));
const Workers = lazy(() => import('@/pages/Workers'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Caisse = lazy(() => import('@/pages/Caisse'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));

function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </motion.div>
  );
}

function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const perms = useCurrentPermissions();
  if (!canAccess(perms, module)) return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="dashboard" element={<PageShell><Dashboard /></PageShell>} />
        <Route
          path="reservations"
          element={<PageShell><RequireModule module="reservations"><Reservations /></RequireModule></PageShell>}
        />
        <Route
          path="chambres"
          element={<PageShell><RequireModule module="chambres"><Chambres /></RequireModule></PageShell>}
        />
        <Route
          path="services"
          element={<PageShell><RequireModule module="services"><Services /></RequireModule></PageShell>}
        />
        <Route
          path="clients"
          element={<PageShell><RequireModule module="clients"><Clients /></RequireModule></PageShell>}
        />
        <Route
          path="workers"
          element={<PageShell><RequireModule module="workers"><Workers /></RequireModule></PageShell>}
        />
        <Route
          path="expenses"
          element={<PageShell><RequireModule module="expenses"><Expenses /></RequireModule></PageShell>}
        />
        <Route
          path="caisse"
          element={<PageShell><RequireModule module="caisse"><Caisse /></RequireModule></PageShell>}
        />
        <Route
          path="reports"
          element={<PageShell><RequireModule module="reports"><Reports /></RequireModule></PageShell>}
        />
        <Route
          path="settings"
          element={<PageShell><RequireModule module="settings"><Settings /></RequireModule></PageShell>}
        />
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const user = useApp((s) => s.user);
  const setUser = useApp((s) => s.setUser);
  const loadAll = useApp((s) => s.loadAll);
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) {
            await loadAll();
            setUser({
              id: session.user.id,
              name: (profile as Record<string, unknown>).name as string ?? '',
              username: (profile as Record<string, unknown>).username as string ?? '',
              email: session.user.email ?? '',
              password: '',
              role: (profile as Record<string, unknown>).role as 'admin' | 'worker' ?? 'worker',
              avatar: (profile as Record<string, unknown>).avatar_url as string ?? null,
              workerId: (profile as Record<string, unknown>).worker_id as string ?? undefined,
            });
          }
        } catch {
          // session exists but profile fetch failed — stay on login
        }
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return <PageSkeleton />;

  return (
    <>
      <div className={location.pathname === '/login' ? 'app-bg login-bg' : 'app-bg'} />
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <Suspense fallback={<PageSkeleton />}>
                <Login />
              </Suspense>
            )
          }
        />
        <Route
          path="/app/*"
          element={
            user ? (
              <AppLayout>
                <AppRoutes />
              </AppLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? '/app/dashboard' : '/login'} replace />} />
      </Routes>
    </>
  );
}
