import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck, Plus, CalendarRange, Eye, Pencil, Printer, CreditCard, User, Phone,
  BedDouble, CalendarDays, Wallet, Trash2, CheckSquare, Square,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { TextField, SegmentedControl } from '@/components/ui/Field';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { ReservationWizard } from '@/components/reservations/ReservationWizard';
import { CalendarTimeline } from '@/components/reservations/CalendarTimeline';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { reservationPaid, reservationRemaining } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, rangesOverlap, todayISO, addDaysISO, monthKey } from '@/lib/utils';
import { clientName, reservationRoomLabels, clientById } from '@/lib/lookups';
import { buildInvoiceHTML, printHTML } from '@/lib/print';
import type { Reservation } from '@/types';

type Period = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'paid' | 'debt';

export default function Reservations() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();
  const deleteReservation = useApp((s) => s.deleteReservation);

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);
  const [payFor, setPayFor] = useState<Reservation | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Selection & delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteOne, setDeleteOne] = useState<Reservation | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const periodRange = useMemo((): [string, string] | null => {
    const today = todayISO();
    if (period === 'today') return [today, addDaysISO(today, 1)];
    if (period === 'week') {
      const d = new Date(today);
      const day = (d.getDay() + 6) % 7;
      const start = addDaysISO(today, -day);
      return [start, addDaysISO(start, 7)];
    }
    if (period === 'month') {
      const mk = monthKey(today);
      return [`${mk}-01`, `${mk}-31`];
    }
    return null;
  }, [period]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.reservations.filter((r) => {
      if (status === 'paid' && !(r.status === 'paid' || r.status === 'active')) return false;
      if (status === 'debt' && r.status !== 'debt') return false;
      if (periodRange && !rangesOverlap(r.checkIn, r.checkOut, periodRange[0], periodRange[1])) return false;
      if (q) {
        const c = clientById(data, r.clientId);
        const hay = `${c?.firstName ?? ''} ${c?.lastName ?? ''} ${c?.phone ?? ''} ${r.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, status, periodRange]);

  // Clear selection whenever the filtered list changes
  useEffect(() => { setSelectedIds(new Set()); }, [search, period, status]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;
  const canDelete = can(perms, 'reservations', 'delete');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  };

  const handleDeleteOne = async () => {
    if (!deleteOne) return;
    await deleteReservation(deleteOne.id);
    toast.success(t('toast.deleted'));
  };

  const handleDeleteBulk = async () => {
    const count = selectedIds.size;
    await Promise.all([...selectedIds].map((id) => deleteReservation(id)));
    setSelectedIds(new Set());
    toast.success(`${count} réservation(s) supprimée(s)`);
  };

  const openCreate = () => { setEditing(null); setWizardOpen(true); };
  const openEdit = (r: Reservation) => { setEditing(r); setWizardOpen(true); };
  const print = (r: Reservation) => printHTML(`${r.code}`, buildInvoiceHTML(data, r, storeInfo));

  return (
    <div>
      <PageHeader
        icon={<CalendarCheck size={24} />}
        title={t('res.title')}
        subtitle={t('res.subtitle')}
        actions={
          <>
            <GradientButton variant="glass" icon={<CalendarRange size={18} />} onClick={() => setCalendarOpen(true)}>
              {t('res.calendar')}
            </GradientButton>
            {can(perms, 'reservations', 'create') && (
              <GradientButton icon={<Plus size={18} />} onClick={openCreate}>
                {t('res.new')}
              </GradientButton>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder={t('res.searchPlaceholder')} className="flex-1" />
        <SegmentedControl<Period>
          value={period}
          onChange={setPeriod}
          size="sm"
          options={[
            { value: 'today', label: t('common.today') },
            { value: 'week', label: t('common.week') },
            { value: 'month', label: t('common.month') },
            { value: 'all', label: t('common.all') },
          ]}
        />
        <SegmentedControl<StatusFilter>
          value={status}
          onChange={setStatus}
          size="sm"
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'paid', label: t('res.statusPaid') },
            { value: 'debt', label: t('res.statusDebt') },
          ]}
        />
      </div>

      {/* Bulk-select toolbar */}
      {filtered.length > 0 && canDelete && (
        <div className="flex items-center gap-3 mb-5 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium text-ink-secondary hover:text-ink-primary transition-colors select-none"
          >
            {allSelected
              ? <CheckSquare size={17} className="text-brand-600" />
              : <Square size={17} />}
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            <span className="text-ink-muted font-normal">({filtered.length})</span>
          </button>

          <AnimatePresence>
            {someSelected && (
              <motion.div
                key="bulk-actions"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3"
              >
                <span className="h-4 w-px bg-slate-300" />
                <span className="text-sm text-brand-600 font-semibold">{selectedIds.size} sélectionnée(s)</span>
                <GradientButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={() => setConfirmBulk(true)}
                >
                  Supprimer la sélection
                </GradientButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={36} />}
          title={t('common.noResults')}
          hint={t('common.emptyHint')}
          action={can(perms, 'reservations', 'create') && <GradientButton icon={<Plus size={18} />} onClick={openCreate}>{t('res.new')}</GradientButton>}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((r) => {
              const remaining = reservationRemaining(r);
              const isSelected = selectedIds.has(r.id);
              return (
                <motion.div key={r.id} variants={listItem} layout exit="exit">
                  <GradientCard
                    className={`p-5 h-full flex flex-col transition-all duration-150 ${
                      isSelected ? 'ring-2 ring-brand-500 ring-offset-1' : ''
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {canDelete && (
                          <button
                            onClick={() => toggleSelect(r.id)}
                            className="shrink-0 text-ink-muted hover:text-brand-600 transition-colors"
                            title={isSelected ? 'Désélectionner' : 'Sélectionner'}
                          >
                            {isSelected
                              ? <CheckSquare size={16} className="text-brand-600" />
                              : <Square size={16} />}
                          </button>
                        )}
                        <span className="text-sm font-bold text-gradient truncate">{r.code}</span>
                      </div>
                      <ResStatusBadge status={r.status} />
                    </div>

                    {/* Info */}
                    <div className="mt-3 space-y-1.5">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                        <User size={15} className="text-ink-muted" /> {clientName(data, r.clientId)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <Phone size={13} className="text-ink-muted" /> {clientById(data, r.clientId)?.phone}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <BedDouble size={13} className="text-ink-muted" /> {reservationRoomLabels(data, r)}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-ink-secondary">
                        <CalendarDays size={13} className="text-ink-muted" /> {formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)} · {r.nights} {t('common.nights')}
                      </p>
                    </div>

                    {/* Totals */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center rounded-xl bg-slate-100/70 border border-slate-200 p-2.5">
                      <div><p className="text-[10px] text-ink-muted">{t('common.total')}</p><p className="text-xs font-bold text-ink-primary">{formatDA(r.total)}</p></div>
                      <div><p className="text-[10px] text-ink-muted">{t('common.paid')}</p><p className="text-xs font-bold text-emerald-600">{formatDA(reservationPaid(r))}</p></div>
                      <div><p className="text-[10px] text-ink-muted">{t('common.remaining')}</p><p className={`text-xs font-bold ${remaining > 0 ? 'text-amber-600' : 'text-ink-secondary'}`}>{formatDA(remaining)}</p></div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-1.5 border-t border-slate-200 pt-3">
                      <button onClick={() => setDetail(r)} className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg glass text-xs font-medium text-ink-primary hover:bg-slate-200/70 transition-colors">
                        <Eye size={14} /> {t('common.view')}
                      </button>
                      {can(perms, 'reservations', 'edit') && (
                        <button onClick={() => openEdit(r)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-brand-600 hover:bg-slate-100 transition-colors" title={t('common.edit')}>
                          <Pencil size={15} />
                        </button>
                      )}
                      {can(perms, 'reservations', 'print') && (
                        <button onClick={() => print(r)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-sky-600 hover:bg-slate-100 transition-colors" title={t('common.print')}>
                          <Printer size={15} />
                        </button>
                      )}
                      {can(perms, 'reservations', 'pay') && remaining > 0 && (
                        <button onClick={() => setPayFor(r)} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-success text-white" title={t('common.pay')}>
                          <CreditCard size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteOne(r)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </GradientCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {wizardOpen && <ReservationWizard open={wizardOpen} editing={editing} onClose={() => { setWizardOpen(false); setEditing(null); }} />}
      <CalendarTimeline open={calendarOpen} onClose={() => setCalendarOpen(false)} onSelect={(r) => { setCalendarOpen(false); setDetail(r); }} />
      <DetailModal reservation={detail} onClose={() => setDetail(null)} onPrint={print} onPay={(r) => { setDetail(null); setPayFor(r); }} data={data} lang={lang} />
      <PaymentModal reservation={payFor} onClose={() => setPayFor(null)} />

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!deleteOne}
        onClose={() => setDeleteOne(null)}
        onConfirm={handleDeleteOne}
        title="Supprimer la réservation"
        message={`Supprimer ${deleteOne?.code} ? Cette action est irréversible.`}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulk}
        onClose={() => setConfirmBulk(false)}
        onConfirm={handleDeleteBulk}
        title="Supprimer la sélection"
        message={`Supprimer ${selectedIds.size} réservation(s) sélectionnée(s) ? Cette action est irréversible.`}
      />
    </div>
  );
}

function DetailModal({
  reservation, onClose, onPrint, onPay, data, lang,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onPrint: (r: Reservation) => void;
  onPay: (r: Reservation) => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const r = reservation;
  if (!r) return <Modal open={false} onClose={onClose}>{null}</Modal>;
  const client = clientById(data, r.clientId);
  const remaining = reservationRemaining(r);

  return (
    <Modal
      open={!!reservation}
      onClose={onClose}
      title={r.code}
      subtitle={client ? `${client.firstName} ${client.lastName}` : ''}
      size="lg"
      footer={
        <div className="flex gap-2 justify-end">
          <GradientButton variant="glass" icon={<Printer size={16} />} onClick={() => onPrint(r)}>{t('common.print')}</GradientButton>
          {remaining > 0 && <GradientButton variant="success" icon={<CreditCard size={16} />} onClick={() => onPay(r)}>{t('common.pay')}</GradientButton>}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <ResStatusBadge status={r.status} />
          <span className="text-xs text-ink-muted">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={t('common.total')} value={formatDA(r.total)} />
          <Stat label={t('common.paid')} value={formatDA(reservationPaid(r))} tone="success" />
          <Stat label={t('common.remaining')} value={formatDA(remaining)} tone={remaining > 0 ? 'danger' : 'default'} />
          <Stat label={t('common.nights')} value={`${r.nights}`} />
        </div>

        <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
          <p className="text-[11px] font-bold text-ink-muted uppercase mb-2">{t('res.step3')}</p>
          {r.rooms.map((rr) => (
            <div key={rr.roomId} className="flex justify-between text-sm py-0.5">
              <span className="text-ink-secondary">Chambre {data.rooms.find((x) => x.id === rr.roomId)?.name}</span>
              <span className="text-ink-primary">{formatDA(rr.pricePerNight)} × {r.nights}</span>
            </div>
          ))}
          {r.services.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-ink-muted uppercase mt-3 mb-2">{t('res.step4')}</p>
              {r.services.map((sv) => (
                <div key={sv.serviceId} className="flex justify-between text-sm py-0.5">
                  <span className="text-ink-secondary">{data.services.find((x) => x.id === sv.serviceId)?.name}</span>
                  <span className="text-ink-primary">{formatDA(sv.unitPrice)} × {sv.quantity}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {r.payments.length > 0 && (
          <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
            <p className="text-[11px] font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
            {r.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-sm py-0.5">
                <span className="text-ink-secondary">{formatDate(p.date, lang)} · {p.note}</span>
                <span className="text-emerald-600 font-medium">{formatDA(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentModal({ reservation, onClose }: { reservation: Reservation | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const addPayment = useApp((s) => s.addPayment);
  const [amount, setAmount] = useState('');

  const r = reservation;
  const remaining = r ? reservationRemaining(r) : 0;
  const payNum = amount === '' ? 0 : Number(amount);
  const after = Math.max(0, remaining - payNum);

  const save = async () => {
    if (!r || payNum <= 0) return toast.error(t('login.required'));
    await addPayment(r.id, Math.min(payNum, remaining), 'Paiement dette');
    toast.success(t('toast.paid'));
    setAmount('');
    onClose();
  };

  return (
    <Modal
      open={!!reservation}
      onClose={onClose}
      title={t('res.payDebt')}
      subtitle={r?.code}
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton variant="success" icon={<Wallet size={16} />} onClick={save}>{t('res.savePayment')}</GradientButton>
        </div>
      }
    >
      {r && (
        <div className="space-y-4">
          <div className="rounded-xl bg-grad-warning/10 border border-amber-400/30 p-4 text-center">
            <p className="text-xs text-ink-secondary">{t('common.remaining')}</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">{formatDA(remaining)}</p>
          </div>

          {r.payments.length > 0 && (
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('res.paymentHistory')}</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {r.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm rounded-lg bg-slate-100/70 px-3 py-1.5">
                    <span className="text-ink-secondary">{formatDate(p.date, lang)}</span>
                    <span className="text-emerald-600 font-medium">{formatDA(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TextField label={`${t('res.payNow')} (DA)`} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus max={remaining} />
          <div className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
            <span className="text-sm text-ink-secondary">{t('res.remainingAfter')}</span>
            <span className={`text-lg font-bold ${after > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{formatDA(after)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
