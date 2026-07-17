import { useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiggyBank, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Wallet,
  ShoppingCart, Wrench, Layers, Pencil, Trash2, AlertTriangle, Tag, BedDouble,
  CalendarRange, Receipt, Printer,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { SectionCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, TextArea, RadioGroup, SegmentedControl } from '@/components/ui/Field';
import { AnimatedNumber } from '@/components/ui/AnimatedCounter';
import { expensesCaisseRecap, expensesCaisseBalance, expensesCaisseEntries } from '@/store/selectors';
import type { ExpenseCaisseEntry, ExpenseCaisseEntryKind } from '@/store/selectors';
import { printHTML } from '@/lib/print';
import { buildExpensesCaisseHTML, CAISSE_PRINT_STYLES } from '@/lib/printCaisse';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, addDaysISO, addMonthsISO, cn } from '@/lib/utils';
import type { CashType, ExpenseCashTransaction } from '@/types';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';
type KindFilter = 'all' | ExpenseCaisseEntryKind;

const DARK_CARD = 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)';

/** Colour identity of each kind of movement, reused by the list, the chips and
 *  the breakdown bars so a deposit always reads green and an expense amber. */
const KIND_STYLE: Record<ExpenseCaisseEntryKind, { chip: string; amount: string; bar: string; dot: string }> = {
  deposit: {
    chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
    amount: 'text-emerald-300',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-400',
  },
  withdrawal: {
    chip: 'bg-rose-500/15 text-rose-300 border-rose-400/25',
    amount: 'text-rose-300',
    bar: 'bg-rose-500',
    dot: 'bg-rose-400',
  },
  expense: {
    chip: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
    amount: 'text-amber-300',
    bar: 'bg-amber-500',
    dot: 'bg-amber-400',
  },
  maintenance: {
    chip: 'bg-violet-500/15 text-violet-300 border-violet-400/25',
    amount: 'text-violet-300',
    bar: 'bg-violet-500',
    dot: 'bg-violet-400',
  },
};

const KIND_ICON: Record<ExpenseCaisseEntryKind, ReactNode> = {
  deposit: <ArrowDownLeft size={17} />,
  withdrawal: <ArrowUpRight size={17} />,
  expense: <ShoppingCart size={17} />,
  maintenance: <Wrench size={17} />,
};

export default function ExpensesCaisse() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const deleteTx = useApp((s) => s.deleteExpenseCashTransaction);
  const storeInfo = useApp((s) => s.storeInfo);

  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(addDaysISO(todayISO(), -30));
  const [customTo, setCustomTo] = useState(todayISO());
  const [kind, setKind] = useState<KindFilter>('all');
  const [txModal, setTxModal] = useState<{ type: CashType; tx: ExpenseCashTransaction | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ExpenseCaisseEntry | null>(null);

  const [from, to] = useMemo((): [string, string] => {
    const today = todayISO();
    if (period === 'today') return [today, today];
    if (period === 'week') return [addDaysISO(today, -6), today];
    if (period === 'month') return [addMonthsISO(today, -1), today];
    if (period === 'year') return [addMonthsISO(today, -12), today];
    return [customFrom, customTo];
  }, [period, customFrom, customTo]);

  const recap = useMemo(() => expensesCaisseRecap(data, from, to), [data, from, to]);
  const balance = useMemo(() => expensesCaisseBalance(data), [data]);
  const entries = useMemo(() => expensesCaisseEntries(data, from, to), [data, from, to]);

  const visibleEntries = useMemo(
    () => (kind === 'all' ? entries : entries.filter((e) => e.kind === kind)),
    [entries, kind],
  );
  const expenseEntries = useMemo(
    () => entries.filter((e) => e.kind === 'expense' || e.kind === 'maintenance'),
    [entries],
  );

  const totalExpenses = recap.generalExpenses + recap.maintenances;
  const counts: Record<KindFilter, number> = {
    all: entries.length,
    deposit: entries.filter((e) => e.kind === 'deposit').length,
    withdrawal: entries.filter((e) => e.kind === 'withdrawal').length,
    expense: entries.filter((e) => e.kind === 'expense').length,
    maintenance: entries.filter((e) => e.kind === 'maintenance').length,
  };

  const kindLabel = (k: ExpenseCaisseEntryKind) =>
    k === 'deposit' ? t('expCaisse.manualDeposit')
      : k === 'withdrawal' ? t('expCaisse.manualWithdrawal')
        : k === 'expense' ? t('expCaisse.expense')
          : t('expCaisse.maintenance');

  /** Label of a filter chip, reused by the chips themselves and the printout. */
  const filterLabel = (k: KindFilter) =>
    k === 'all' ? t('expCaisse.all')
      : k === 'deposit' ? t('expCaisse.deposits')
        : k === 'withdrawal' ? t('expCaisse.withdrawals')
          : k === 'expense' ? t('expCaisse.expenses')
            : t('expCaisse.maintenances');

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteTx(pendingDelete.id);
    toast.success(t('toast.deleted'));
  };

  /** Prints exactly what the period + kind filters currently select. */
  const printList = () => {
    printHTML(
      t('expCaisse.printTitle'),
      buildExpensesCaisseHTML({
        entries: visibleEntries,
        recap,
        balance,
        store: storeInfo,
        from,
        to,
        filterLabel: filterLabel(kind),
      }),
      CAISSE_PRINT_STYLES,
    );
  };

  return (
    <div>
      <PageHeader
        icon={<PiggyBank size={24} />}
        title={t('expCaisse.title')}
        subtitle={t('expCaisse.subtitle')}
        actions={
          <>
            <GradientButton variant="glass" icon={<Printer size={18} />} onClick={printList}>
              {t('expCaisse.print')}
            </GradientButton>
            <GradientButton variant="success" icon={<ArrowDownLeft size={18} />} onClick={() => setTxModal({ type: 'deposit', tx: null })}>
              {t('expCaisse.deposit')}
            </GradientButton>
            <GradientButton variant="danger" icon={<ArrowUpRight size={18} />} onClick={() => setTxModal({ type: 'withdrawal', tx: null })}>
              {t('expCaisse.withdraw')}
            </GradientButton>
          </>
        }
      />

      {/* Balance + period totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl p-6 shadow-glow bg-grad-rose"
          style={{ backgroundSize: '200% 200%' }}
        >
          <div className="absolute inset-0 bg-grad-rose animate-gradient-shift opacity-80" style={{ backgroundSize: '200% 200%' }} />
          <PiggyBank size={92} className="absolute -bottom-4 -end-3 text-white/10 rotate-[-8deg]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/85"><Wallet size={18} /><span className="text-sm font-medium">{t('expCaisse.balance')}</span></div>
            <p className="mt-2 text-4xl font-extrabold text-white"><AnimatedNumber value={balance} format={formatDA} /></p>
            <p className="mt-1 text-[11px] text-white/70">{t('expCaisse.balanceHint')}</p>
          </div>
        </motion.div>

        <StatCard
          icon={<TrendingUp size={18} />}
          label={t('expCaisse.totalDeposits')}
          value={recap.deposits}
          tone="emerald"
          sign="+"
        />
        <StatCard
          icon={<TrendingDown size={18} />}
          label={t('expCaisse.totalWithdrawals')}
          value={recap.withdrawals}
          tone="rose"
          sign="−"
        />
        <StatCard
          icon={<Receipt size={18} />}
          label={t('expCaisse.totalExpenses')}
          value={totalExpenses}
          tone="amber"
          sign="−"
          hint={`${recap.expenseCount} ${t('expCaisse.expensesCount')}`}
        />
      </div>

      {balance < 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
        >
          <AlertTriangle size={18} className="shrink-0" />
          {t('expCaisse.negativeBalance')}
        </motion.div>
      )}

      {/* Period filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SegmentedControl<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'today', label: t('common.today') },
            { value: 'week', label: t('common.week') },
            { value: 'month', label: t('common.month') },
            { value: 'year', label: t('common.year') },
            { value: 'custom', label: t('common.custom') },
          ]}
        />
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <TextField type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-ink-muted">→</span>
            <TextField type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          <CalendarRange size={14} />
          {formatDate(from, lang)} → {formatDate(to, lang)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Detailed movements */}
          <SectionCard
            dark
            style={{ background: DARK_CARD }}
            title={t('expCaisse.movements')}
            icon={<Layers size={18} />}
            action={<span className="text-xs text-sky-200/70">{visibleEntries.length} {t('expCaisse.movementsCount')}</span>}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {(['all', 'deposit', 'withdrawal', 'expense', 'maintenance'] as KindFilter[]).map((k) => {
                const active = kind === k;
                const label = filterLabel(k);
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
                      active
                        ? 'bg-white text-slate-900 border-white shadow-md'
                        : 'bg-white/10 text-sky-100 border-white/15 hover:bg-white/20',
                    )}
                  >
                    {k !== 'all' && <span className={cn('h-2 w-2 rounded-full', KIND_STYLE[k].dot)} />}
                    {label}
                    <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-slate-900/10' : 'bg-white/15')}>{counts[k]}</span>
                  </button>
                );
              })}
            </div>

            {visibleEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 border border-white/10 text-sky-300 mb-3">
                  <PiggyBank size={26} />
                </span>
                <p className="text-sm font-semibold text-white">{t('expCaisse.noMovements')}</p>
                <p className="text-xs text-sky-200/60 mt-1">{t('expCaisse.noMovementsHint')}</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2 max-h-[30rem] overflow-y-auto pe-1 scrollbar-thin">
                <AnimatePresence>
                  {visibleEntries.map((e) => {
                    const style = KIND_STYLE[e.kind];
                    return (
                      <motion.div key={`${e.kind}-${e.id}`} variants={listItem} layout exit="exit"
                        className="flex items-start justify-between gap-3 rounded-xl bg-white/10 border border-white/10 px-4 py-3 hover:bg-white/[0.14] transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg border', style.chip)}>
                            {KIND_ICON[e.kind]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{e.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', style.chip)}>
                                {kindLabel(e.kind)}
                              </span>
                              {e.subtitle && (
                                <span className="flex items-center gap-1 text-[11px] text-sky-200/80">
                                  {e.kind === 'maintenance' ? <BedDouble size={11} /> : <Tag size={11} />}
                                  {e.subtitle}
                                </span>
                              )}
                              <span className="text-[11px] text-sky-200/60">· {formatDate(e.date, lang)}</span>
                            </div>
                            {e.description && <p className="mt-1 text-xs text-slate-300 line-clamp-2">{e.description}</p>}
                            {!e.removable && <p className="mt-1 text-[10px] text-sky-200/50">{t('expCaisse.fromExpensesPage')}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('text-sm font-extrabold', style.amount)}>
                            {e.direction === 'in' ? '+' : '−'}{formatDA(e.amount)}
                          </span>
                          {e.removable && (
                            <>
                              <button
                                title={t('common.edit')}
                                onClick={() => {
                                  const tx = data.expenseCashTransactions.find((x) => x.id === e.id);
                                  if (tx) setTxModal({ type: tx.type, tx });
                                }}
                                className="btn-card-action btn-action-edit h-8 w-8 rounded-lg"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                title={t('common.delete')}
                                onClick={() => setPendingDelete(e)}
                                className="btn-card-action btn-action-delete h-8 w-8 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </SectionCard>

          {/* Expenses recorded on the Expenses page, for the same period */}
          <SectionCard
            dark
            style={{ background: DARK_CARD }}
            title={t('expCaisse.expensesList')}
            icon={<Receipt size={18} />}
            action={<span className="text-xs font-bold text-amber-300">−{formatDA(totalExpenses)}</span>}
          >
            {expenseEntries.length === 0 ? (
              <p className="text-sm text-sky-200/60 text-center py-8">{t('common.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-[11px] uppercase tracking-wide text-sky-200/60">
                      <th className="text-start font-semibold pb-2">{t('common.name')}</th>
                      <th className="text-start font-semibold pb-2">{t('common.category')}</th>
                      <th className="text-start font-semibold pb-2 hidden sm:table-cell">{t('common.description')}</th>
                      <th className="text-start font-semibold pb-2">{t('common.date')}</th>
                      <th className="text-end font-semibold pb-2">{t('common.amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseEntries.map((e) => (
                      <tr key={`${e.kind}-${e.id}`} className="border-t border-white/10">
                        <td className="py-2.5 pe-3">
                          <span className="flex items-center gap-2 font-medium text-white">
                            <span className={cn('grid h-6 w-6 place-items-center rounded-md border', KIND_STYLE[e.kind].chip)}>
                              {e.kind === 'maintenance' ? <Wrench size={11} /> : <ShoppingCart size={11} />}
                            </span>
                            {e.title}
                          </span>
                        </td>
                        <td className="py-2.5 pe-3 text-sky-200/80">{e.subtitle || '—'}</td>
                        <td className="py-2.5 pe-3 text-slate-300 hidden sm:table-cell max-w-[16rem] truncate">{e.description || '—'}</td>
                        <td className="py-2.5 pe-3 text-sky-200/70 whitespace-nowrap">{formatDate(e.date, lang)}</td>
                        <td className={cn('py-2.5 text-end font-bold whitespace-nowrap', KIND_STYLE[e.kind].amount)}>−{formatDA(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Recap + breakdowns */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 shadow-xl overflow-hidden sticky top-24" style={{ background: DARK_CARD }}>
            <div className="bg-white/10 px-5 py-4">
              <p className="text-sky-200/80 text-xs">{t('expCaisse.recap')}</p>
              <p className="text-white text-sm font-semibold">{formatDate(from, lang)} → {formatDate(to, lang)}</p>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              <RecapLine label={t('expCaisse.deposits')} value={recap.deposits} tone="in" />
              <div className="border-t border-white/10 pt-2.5 flex justify-between font-bold text-emerald-300">
                <span>{t('caisse.totalIn')}</span><span>+{formatDA(recap.deposits)}</span>
              </div>

              <div className="pt-2 space-y-2.5">
                <RecapLine label={t('expCaisse.withdrawals')} value={recap.withdrawals} tone="out" />
                <RecapLine label={t('caisse.generalExpenses')} value={recap.generalExpenses} tone="out" />
                <RecapLine label={t('caisse.maintenances')} value={recap.maintenances} tone="out" />
                <div className="border-t border-white/10 pt-2.5 flex justify-between font-bold text-rose-300">
                  <span>{t('caisse.totalOut')}</span><span>−{formatDA(recap.totalOut)}</span>
                </div>
              </div>

              <div className="border-t-2 border-white/20 mt-2 pt-3 flex justify-between items-center">
                <span className="font-bold text-white">{t('expCaisse.netFlow')}</span>
                <span className={cn('text-xl font-extrabold', recap.net >= 0 ? 'text-emerald-300' : 'text-rose-300')}>{formatDA(recap.net)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-sky-200/70">
                <span>{t('expCaisse.balance')}</span>
                <span className={cn('font-semibold', balance >= 0 ? 'text-white' : 'text-rose-300')}>{formatDA(balance)}</span>
              </div>
            </div>
          </div>

          {recap.expensesByCategory.length > 0 && (
            <BreakdownCard
              title={t('expCaisse.byCategory')}
              icon={<Tag size={18} />}
              rows={recap.expensesByCategory}
              total={recap.generalExpenses}
              bar={KIND_STYLE.expense.bar}
              amountClass={KIND_STYLE.expense.amount}
            />
          )}

          {recap.maintenancesByRoom.length > 0 && (
            <BreakdownCard
              title={t('expCaisse.byRoom')}
              icon={<BedDouble size={18} />}
              rows={recap.maintenancesByRoom}
              total={recap.maintenances}
              bar={KIND_STYLE.maintenance.bar}
              amountClass={KIND_STYLE.maintenance.amount}
            />
          )}
        </div>
      </div>

      {txModal && (
        <TxModal
          type={txModal.type}
          tx={txModal.tx}
          onClose={() => setTxModal(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        message={pendingDelete ? `${t('common.deleteMsg')} (${pendingDelete.title})` : ''}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, tone, sign, hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'rose' | 'amber';
  sign: '+' | '−';
  hint?: string;
}) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300' : tone === 'rose' ? 'text-rose-300' : 'text-amber-300';
  return (
    <SectionCard dark style={{ background: DARK_CARD }} className="flex flex-col justify-center">
      <div className={cn('flex items-center gap-2', toneClass)}>{icon}<span className="text-sm font-medium">{label}</span></div>
      <p className="mt-1 text-2xl font-extrabold text-white">
        <span className={toneClass}>{sign}</span>
        <AnimatedNumber value={value} format={formatDA} />
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-sky-200/60">{hint}</p>}
    </SectionCard>
  );
}

function RecapLine({ label, value, tone }: { label: string; value: number; tone: 'in' | 'out' }) {
  return (
    <div className="flex justify-between text-slate-200">
      <span>{label}</span>
      <span className={cn('font-medium', tone === 'in' ? 'text-emerald-300' : 'text-rose-300')}>
        {tone === 'in' ? '+' : '−'}{formatDA(value)}
      </span>
    </div>
  );
}

function BreakdownCard({
  title, icon, rows, total, bar, amountClass,
}: {
  title: string;
  icon: ReactNode;
  rows: { name: string; total: number }[];
  total: number;
  bar: string;
  amountClass: string;
}) {
  return (
    <SectionCard dark style={{ background: DARK_CARD }} title={title} icon={icon}>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.name}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-sky-100 truncate pe-2">{r.name}</span>
              <span className={cn('font-semibold shrink-0', amountClass)}>−{formatDA(r.total)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${total > 0 ? (r.total / total) * 100 : 0}%` }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className={cn('h-full rounded-full', bar)}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TxModal({ type, tx, onClose }: { type: CashType; tx: ExpenseCashTransaction | null; onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const addTx = useApp((s) => s.addExpenseCashTransaction);
  const updateTx = useApp((s) => s.updateExpenseCashTransaction);

  const [txType, setTxType] = useState<CashType>(tx?.type ?? type);
  const [amount, setAmount] = useState(String(tx?.amount ?? ''));
  const [description, setDescription] = useState(tx?.description ?? '');
  const [date, setDate] = useState(tx?.date ?? todayISO());
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0 || !description.trim()) {
      return toast.error(t('login.required'));
    }
    setSaving(true);
    try {
      const payload = { type: txType, amount: value, description: description.trim(), date };
      if (tx) {
        await updateTx(tx.id, payload);
        toast.success(t('toast.updated'));
      } else {
        await addTx(payload);
        toast.success(t('toast.created'));
      }
      onClose();
    } catch {
      toast.error(t('toast.error'));
    } finally {
      setSaving(false);
    }
  };

  const title = tx
    ? t('expCaisse.editTx')
    : txType === 'deposit'
      ? t('expCaisse.newDeposit')
      : t('expCaisse.newWithdrawal');

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton variant={txType === 'deposit' ? 'success' : 'danger'} onClick={save} disabled={saving}>
            {t('common.save')}
          </GradientButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-ink-secondary mb-1.5">{t('caisse.type')}</p>
          <RadioGroup<CashType>
            value={txType}
            onChange={setTxType}
            options={[
              { value: 'deposit', label: t('expCaisse.deposit') },
              { value: 'withdrawal', label: t('expCaisse.withdraw') },
            ]}
          />
        </div>
        <TextField
          label={`${t('common.amount')} (DA)`}
          required
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        <TextArea label={t('common.description')} required value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField label={t('common.date')} required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </Modal>
  );
}
