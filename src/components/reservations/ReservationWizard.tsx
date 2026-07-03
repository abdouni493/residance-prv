import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, UserPlus, Search, ArrowLeft, ArrowRight, BedDouble, Users as UsersIcon,
  CalendarDays, Moon, Sparkles, UserCheck, Wrench,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextArea, TextField } from '@/components/ui/Field';
import { ClientForm } from '@/components/forms/ClientForm';
import { isRoomAvailableForRange, reservationPaid } from '@/store/selectors';
import { cn, formatDA, nightsBetween, todayISO, addDaysISO, initials } from '@/lib/utils';
import { categoryName, floorName } from '@/lib/lookups';
import type { Reservation, ReservationService } from '@/types';

export function ReservationWizard({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Reservation | null;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addClient = useApp((s) => s.addClient);
  const addReservation = useApp((s) => s.addReservation);
  const updateReservation = useApp((s) => s.updateReservation);

  const hasServices = data.services.length > 0;

  // ---- wizard state ----
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<string | null>(editing?.clientId ?? null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const [checkIn, setCheckIn] = useState(editing?.checkIn ?? todayISO());
  const [checkOut, setCheckOut] = useState(editing?.checkOut ?? addDaysISO(todayISO(), 1));
  const [checkInTime, setCheckInTime] = useState(editing?.checkInTime ?? '14:00');
  const [checkOutTime, setCheckOutTime] = useState(editing?.checkOutTime ?? '11:00');

  const [roomIds, setRoomIds] = useState<string[]>(editing?.rooms.map((r) => r.roomId) ?? []);
  const [services, setServices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    editing?.services.forEach((s) => (init[s.serviceId] = s.quantity));
    return init;
  });

  const nights = nightsBetween(checkIn, checkOut);

  const roomsTotal = useMemo(
    () => roomIds.reduce((sum, id) => {
      const room = data.rooms.find((r) => r.id === id);
      return sum + (room ? room.pricePerNight * nights : 0);
    }, 0),
    [roomIds, data.rooms, nights],
  );
  const servicesTotal = useMemo(
    () => Object.entries(services).reduce((sum, [id, qty]) => {
      const svc = data.services.find((s) => s.id === id);
      return sum + (svc ? svc.price * qty : 0);
    }, 0),
    [services, data.services],
  );
  const computedTotal = roomsTotal + servicesTotal;

  const [editedTotal, setEditedTotal] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState<string>(editing?.notes ?? '');

  const finalTotal = editedTotal === '' ? computedTotal : Number(editedTotal);
  const alreadyPaid = editing ? reservationPaid(editing) : 0;
  const paidNum = amountPaid === '' ? (editing ? alreadyPaid : computedTotal) : Number(amountPaid);
  const remaining = Math.max(0, finalTotal - paidNum);

  const client = data.clients.find((c) => c.id === clientId);

  // Build steps (skip services if none)
  const steps = useMemo(() => {
    const base = [
      { key: 'client', label: t('res.step1') },
      { key: 'dates', label: t('res.step2') },
      { key: 'rooms', label: t('res.step3') },
    ];
    if (hasServices) base.push({ key: 'services', label: t('res.step4') });
    base.push({ key: 'recap', label: t('res.step5') });
    return base;
  }, [hasServices, t]);

  const currentKey = steps[step]?.key;

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const list = q
      ? data.clients.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.phone.includes(q))
      : data.clients;
    return list.slice(0, 8);
  }, [clientSearch, data.clients]);

  const canNext = () => {
    if (currentKey === 'client') return !!clientId;
    if (currentKey === 'dates') return nights > 0;
    if (currentKey === 'rooms') return roomIds.length > 0;
    return true;
  };

  const goNext = () => {
    if (currentKey === 'rooms' && roomIds.length === 0) return toast.error(t('res.noRoomSelected'));
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleCreate = () => {
    if (!clientId || roomIds.length === 0) return;
    const resRooms = roomIds.map((id) => {
      const room = data.rooms.find((r) => r.id === id)!;
      return { roomId: id, pricePerNight: room.pricePerNight };
    });
    const resServices: ReservationService[] = Object.entries(services)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const svc = data.services.find((s) => s.id === id)!;
        return { serviceId: id, quantity: qty, unitPrice: svc.price };
      });

    if (editing) {
      // Keep prior payments; if amountPaid changed beyond prior, add the difference as a payment
      const payments = [...editing.payments];
      const diff = paidNum - alreadyPaid;
      if (diff > 0) payments.push({ id: `pay-${Date.now()}`, amount: diff, date: todayISO(), note: 'Ajustement' });
      updateReservation(editing.id, {
        clientId, rooms: resRooms, services: resServices, checkIn, checkOut,
        checkInTime, checkOutTime, nights, total: finalTotal, payments,
        notes: notes.trim() || undefined,
      });
      toast.success(t('toast.updated'));
    } else {
      addReservation({
        clientId, rooms: resRooms, services: resServices, checkIn, checkOut,
        checkInTime, checkOutTime, nights, total: finalTotal,
        payments: paidNum > 0 ? [{ id: `pay-${Date.now()}`, amount: paidNum, date: todayISO(), note: 'Paiement initial' }] : [],
        status: 'paid',
        notes: notes.trim() || undefined,
      });
      toast.success(t('res.createdOk'));
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? `${t('common.edit')} · ${editing.code}` : t('res.new')}
      footer={
        <div className="flex items-center justify-between gap-3">
          <GradientButton variant="glass" icon={<ArrowLeft size={16} />} onClick={goBack} disabled={step === 0}>
            {t('common.previous')}
          </GradientButton>
          <div className="text-sm text-ink-secondary hidden sm:block">
            {computedTotal > 0 && (
              <span>{t('common.total')}: <span className="font-bold text-gradient">{formatDA(finalTotal)}</span></span>
            )}
          </div>
          {currentKey === 'recap' ? (
            <GradientButton icon={<Check size={18} />} onClick={handleCreate} glow>
              {editing ? t('common.save') : t('res.createReservation')}
            </GradientButton>
          ) : (
            <GradientButton iconRight={<ArrowRight size={16} />} onClick={goNext} disabled={!canNext()}>
              {t('common.next')}
            </GradientButton>
          )}
        </div>
      }
    >
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6 px-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  scale: i === step ? 1.1 : 1,
                  backgroundColor: i < step ? '#10B981' : i === step ? '#6366F1' : 'rgba(255,255,255,0.08)',
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-white text-sm font-bold shrink-0"
              >
                {i < step ? <Check size={16} /> : i + 1}
              </motion.div>
              <span className={cn('text-[11px] font-medium whitespace-nowrap', i === step ? 'text-ink-primary' : 'text-ink-muted')}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div className="h-full bg-grad-success" initial={{ width: 0 }} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentKey}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="min-h-[320px]"
        >
          {/* STEP 1: CLIENT */}
          {currentKey === 'client' && (
            <div>
              {creatingClient ? (
                <ClientForm
                  submitLabel={t('common.create')}
                  onCancel={() => setCreatingClient(false)}
                  onSave={(form) => {
                    const c = addClient(form);
                    setClientId(c.id);
                    setCreatingClient(false);
                    toast.success(t('toast.created'));
                  }}
                />
              ) : client ? (
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-grad-success text-white font-bold">
                    {initials(`${client.firstName} ${client.lastName}`)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="flex items-center gap-2 text-lg font-bold text-ink-primary">
                      <UserCheck size={18} className="text-emerald-600" /> {client.firstName} {client.lastName}
                    </p>
                    <p className="text-sm text-ink-secondary">{client.phone} · {client.documentNumber}</p>
                  </div>
                  <GradientButton variant="glass" onClick={() => setClientId(null)}>{t('common.change')}</GradientButton>
                </div>
              ) : (
                <div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search size={18} className="absolute inset-y-0 start-3.5 my-auto text-ink-muted" />
                      <input
                        autoFocus value={clientSearch} onChange={(e) => setClientSearch(e.target.value)}
                        placeholder={t('res.searchPlaceholder')}
                        className="w-full h-11 rounded-xl bg-slate-100/70 border border-slate-200 ps-11 pe-4 text-sm text-ink-primary outline-none focus:border-brand-400/60"
                      />
                    </div>
                    <GradientButton icon={<UserPlus size={17} />} onClick={() => setCreatingClient(true)}>
                      {t('res.newClient')}
                    </GradientButton>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id} onClick={() => setClientId(c.id)}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100/70 p-3 text-start hover:border-brand-400/50 hover:bg-brand-500/10 transition-all"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-grad-rose text-white text-xs font-bold shrink-0">
                          {initials(`${c.firstName} ${c.lastName}`)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink-primary truncate">{c.firstName} {c.lastName}</span>
                          <span className="block text-xs text-ink-muted">{c.phone}</span>
                        </span>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="text-sm text-ink-muted col-span-full text-center py-6">{t('common.noResults')}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DATES */}
          {currentKey === 'dates' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField label={t('res.checkIn')} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                <TextField label={t('res.checkOut')} type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
                <TextField label={t('res.checkInTime')} type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
                <TextField label={t('res.checkOutTime')} type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
              </div>
              <div className="flex items-center justify-center py-6">
                <motion.div key={nights} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="flex flex-col items-center gap-2 rounded-3xl bg-grad-primary/10 border border-brand-400/30 px-12 py-6">
                  <Moon size={28} className="text-brand-600" />
                  <span className="text-5xl font-extrabold text-gradient">{nights}</span>
                  <span className="text-sm text-ink-secondary">{nights > 1 ? t('common.nights') : t('common.night')}</span>
                </motion.div>
              </div>
              {nights <= 0 && <p className="text-center text-sm text-rose-600">{t('res.checkOut')} &gt; {t('res.checkIn')}</p>}
            </div>
          )}

          {/* STEP 3: ROOMS */}
          {currentKey === 'rooms' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {data.rooms.map((room) => {
                  const isMaintenance = room.status === 'maintenance';
                  const available = !isMaintenance && isRoomAvailableForRange(room.id, checkIn, checkOut, data.reservations, editing?.id);
                  const selected = roomIds.includes(room.id);
                  const disabled = isMaintenance || !available;
                  return (
                    <button
                      key={room.id}
                      disabled={disabled}
                      onClick={() => setRoomIds((prev) => prev.includes(room.id) ? prev.filter((x) => x !== room.id) : [...prev, room.id])}
                      className={cn(
                        'relative text-start rounded-xl border p-3.5 transition-all overflow-hidden',
                        selected ? 'border-brand-400/70 bg-brand-500/15 shadow-glow' :
                          disabled ? 'border-slate-200 bg-white/[0.02] opacity-60 cursor-not-allowed' :
                          'border-slate-200 bg-slate-100/70 hover:border-emerald-400/50 hover:bg-emerald-500/10',
                      )}
                    >
                      {isMaintenance && (
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #F59E0B, #F59E0B 6px, transparent 6px, transparent 12px)' }} />
                      )}
                      <div className="relative flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <BedDouble size={18} className={selected ? 'text-brand-600' : 'text-ink-muted'} />
                          <span className="font-bold text-ink-primary">{room.name}</span>
                        </div>
                        <span className={cn('grid h-5 w-5 place-items-center rounded-md border transition-colors', selected ? 'bg-grad-primary border-transparent' : 'border-slate-300')}>
                          {selected && <Check size={13} className="text-white" strokeWidth={3} />}
                        </span>
                      </div>
                      <p className="relative text-xs text-ink-muted mt-1">{categoryName(data, room.categoryId)} · {floorName(data, room.floorId)}</p>
                      <div className="relative mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-ink-secondary"><UsersIcon size={12} /> {room.capacity}</span>
                        <span className="text-sm font-bold text-gradient">{formatDA(room.pricePerNight)}</span>
                      </div>
                      {isMaintenance && <span className="relative mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-600"><Wrench size={10} /> {t('rooms.maintenance')}</span>}
                      {!isMaintenance && !available && <span className="relative mt-1.5 block text-[10px] text-rose-600">{t('res.unavailable')}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
                <span className="text-sm text-ink-secondary">{roomIds.length} {t('nav.chambres')} · {nights} {t('common.nights')}</span>
                <span className="text-lg font-extrabold text-gradient">{formatDA(roomsTotal)}</span>
              </div>
            </div>
          )}

          {/* STEP 4: SERVICES */}
          {currentKey === 'services' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.services.map((svc) => {
                  const qty = services[svc.id] ?? 0;
                  const active = qty > 0;
                  return (
                    <div key={svc.id} className={cn('rounded-xl border p-4 transition-all', active ? 'border-brand-400/60 bg-brand-500/10' : 'border-slate-200 bg-slate-100/70')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-10 w-10 place-items-center rounded-lg bg-grad-gold text-white shrink-0"><Sparkles size={18} /></span>
                          <div>
                            <p className="font-semibold text-ink-primary">{svc.name}</p>
                            <p className="text-xs text-ink-muted">{formatDA(svc.price)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setServices((prev) => ({ ...prev, [svc.id]: active ? 0 : 1 }))}
                          className={cn('grid h-6 w-6 place-items-center rounded-md border shrink-0', active ? 'bg-grad-primary border-transparent' : 'border-slate-300')}
                        >
                          {active && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                      </div>
                      {active && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-ink-muted">Qté</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setServices((p) => ({ ...p, [svc.id]: Math.max(1, qty - 1) }))} className="grid h-7 w-7 place-items-center rounded-lg glass text-ink-primary">−</button>
                            <span className="w-8 text-center text-sm font-bold text-ink-primary">{qty}</span>
                            <button onClick={() => setServices((p) => ({ ...p, [svc.id]: qty + 1 }))} className="grid h-7 w-7 place-items-center rounded-lg glass text-ink-primary">+</button>
                          </div>
                          <span className="ms-auto text-sm font-bold text-gradient">{formatDA(svc.price * qty)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
                <span className="text-sm text-ink-secondary">{t('res.selectServices')}</span>
                <span className="text-lg font-extrabold text-gradient">{formatDA(servicesTotal)}</span>
              </div>
            </div>
          )}

          {/* STEP 5: RECAP */}
          {currentKey === 'recap' && client && (
            <div className="space-y-4">
              <RecapSection title={t('res.step1')}>
                <p className="text-ink-primary font-medium">{client.firstName} {client.lastName} · {client.phone}</p>
                <p className="text-xs text-ink-muted">{client.documentNumber}</p>
              </RecapSection>

              <RecapSection title={t('res.step2')}>
                <div className="flex items-center gap-2 text-ink-primary">
                  <CalendarDays size={15} className="text-brand-400" />
                  <span>{checkIn} → {checkOut} · {nights} {t('common.nights')}</span>
                </div>
                <p className="text-xs text-ink-muted">{t('res.checkIn')}: {checkInTime} · {t('res.checkOut')}: {checkOutTime}</p>
              </RecapSection>

              <RecapSection title={t('res.step3')}>
                {roomIds.map((id) => {
                  const room = data.rooms.find((r) => r.id === id)!;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-secondary">{room.name} ({categoryName(data, room.categoryId)}) × {nights}</span>
                      <span className="text-ink-primary font-medium">{formatDA(room.pricePerNight * nights)}</span>
                    </div>
                  );
                })}
              </RecapSection>

              {servicesTotal > 0 && (
                <RecapSection title={t('res.step4')}>
                  {Object.entries(services).filter(([, q]) => q > 0).map(([id, qty]) => {
                    const svc = data.services.find((s) => s.id === id)!;
                    return (
                      <div key={id} className="flex items-center justify-between text-sm">
                        <span className="text-ink-secondary">{svc.name} × {qty}</span>
                        <span className="text-ink-primary font-medium">{formatDA(svc.price * qty)}</span>
                      </div>
                    );
                  })}
                </RecapSection>
              )}

              <div className="rounded-2xl bg-grad-primary/10 border border-brand-400/30 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextField label={`${t('res.editableTotal')} (DA)`} type="number" value={editedTotal === '' ? String(computedTotal) : editedTotal} onChange={(e) => setEditedTotal(e.target.value)} />
                  <TextField label={`${t('res.amountPaid')} (DA)`} type="number" value={amountPaid === '' ? String(editing ? alreadyPaid : computedTotal) : amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-sm text-ink-secondary">{t('common.remaining')}</span>
                  <span className={cn('text-xl font-extrabold', remaining > 0 ? 'text-amber-600' : 'text-emerald-600')}>{formatDA(remaining)}</span>
                </div>
              </div>

              <TextArea
                label={t('res.notes')}
                placeholder={t('res.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}

function RecapSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-100/70 border border-slate-200 p-4">
      <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
