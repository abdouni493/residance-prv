import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Mail, Lock, User, LogIn, ArrowLeft, UserPlus } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { TextField } from '@/components/ui/Field';
import { GradientButton } from '@/components/ui/GradientButton';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Particles } from '@/components/Particles';
import { staggerContainer, fadeInUp } from '@/animations';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const login = useApp((s) => s.login);
  const signup = useApp((s) => s.signup);
  const storeInfo = useApp((s) => s.storeInfo);

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error(t('login.required'));
    if (await login(identifier, password)) {
      toast.success(t('login.welcome'));
      navigate('/app/dashboard');
    } else {
      toast.error(t('login.error'));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !username || !pw) return toast.error(t('login.required'));
    if (pw !== pw2) return toast.error(t('login.mismatch'));
    const res = await signup({ firstName, lastName, email, username, password: pw });
    if (res.ok) {
      toast.success(t('login.welcome'));
      navigate('/app/dashboard');
    } else {
      toast.error(res.error ?? t('toast.error'));
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <Particles />

      <div className="absolute top-5 end-5 z-10">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-strong rounded-3xl border border-slate-200 shadow-card p-7 sm:p-9 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-grad-primary opacity-30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-grad-secondary opacity-20 blur-3xl" />

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="relative">
            {/* Brand */}
            <motion.div variants={fadeInUp} className="flex flex-col items-center text-center mb-7">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-grad-primary text-white shadow-glow-lg mb-4">
                <Building2 size={32} />
              </div>
              <h1 className="text-2xl font-extrabold text-ink-primary">{storeInfo.name}</h1>
              <p className="text-sm text-ink-secondary mt-1">
                {mode === 'login' ? t('login.subtitle') : t('login.signUpTitle')}
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.form
                  key="login"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <motion.div variants={fadeInUp}>
                    <TextField
                      label={t('login.identifier')}
                      icon={<Mail size={17} />}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="email ou nom d'utilisateur"
                      autoComplete="username"
                      autoFocus
                    />
                  </motion.div>
                  <motion.div variants={fadeInUp}>
                    <TextField
                      label={t('login.password')}
                      type="password"
                      icon={<Lock size={17} />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </motion.div>

                  <motion.div variants={fadeInUp}>
                    <GradientButton type="submit" fullWidth size="lg" icon={<LogIn size={18} />} glow>
                      {t('login.signIn')}
                    </GradientButton>
                  </motion.div>

                  <motion.div variants={fadeInUp} className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1.5"
                    >
                      <UserPlus size={15} />
                      {t('login.createAccount')}
                    </button>
                  </motion.div>
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  onSubmit={handleSignup}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label={t('login.firstName')}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoFocus
                    />
                    <TextField
                      label={t('login.lastName')}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <TextField
                    label={t('common.email')}
                    type="email"
                    icon={<Mail size={17} />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <TextField
                    label={t('login.username')}
                    icon={<User size={17} />}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label={t('login.password')}
                      type="password"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      autoComplete="new-password"
                    />
                    <TextField
                      label={t('login.confirmPassword')}
                      type="password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  <GradientButton type="submit" fullWidth size="lg" icon={<UserPlus size={18} />} glow>
                    {t('login.createAccount')}
                  </GradientButton>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-sm text-ink-secondary hover:text-ink-primary font-medium inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft size={15} />
                      {t('login.haveAccount')}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
