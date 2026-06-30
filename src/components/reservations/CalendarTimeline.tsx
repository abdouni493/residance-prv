import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Building2, X, Phone, User, CalendarDays, Calendar } from 'lucide-react';
import { GradientButton } from '@/components/ui/GradientButton';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { cn, todayISO, formatDA, formatDate } from '@/lib/utils';
import { categoryName, clientName, clientById } from '@/lib/lookups';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { reservationRemaining } from '@/store/selectors';
import type { Reservation, ReservationStatus } from '@/types';

const CELL = 38;

// Deterministic vibrant gradient color generator for reservation blocks
const getResBgColor = (code: string) => {
  const colors = [
    'from-sky-500 to-cyan-500 border-sky-400 text-white shadow-sky-500/20',
    'from-indigo-500 to-violet-500 border-indigo-400 text-white shadow-indigo-500/20',
    'from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-emerald-500/20',
    'from-amber-500 to-orange-500 border-amber-400 text-white shadow-amber-500/20',
    'from-rose-500 to-pink-500 border-rose-400 text-white shadow-rose-500/20',
    'from-fuchsia-500 to-purple-500 border-fuchsia-400 text-white shadow-fuchsia-500/20',
    'from-blue-500 to-indigo-500 border-blue-400 text-white shadow-blue-500/20',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function CalendarTimeline({
  open, onClose, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (r: Reservation) => void;
}) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const today = todayISO();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Navigation and filter states
  const [monthOffset, setMonthOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | 'all'>('all');
  const [popover, setPopover] = useState<{ res: Reservation; x: number; y: number } | null>(null);

  const { year, month, daysInMonth, monthLabel, days } = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'long', year: 'numeric' });
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        num: i + 1,
        iso: date.toISOString().slice(0, 10),
        weekday: date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'narrow' }),
        isToday: date.toISOString().slice(0, 10) === today,
        isWeekend: date.getDay() === 5 || date.getDay() === 6,
      };
    });
    return { year, month, daysInMonth, monthLabel, days };
  }, [monthOffset, lang, today]);

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const dayIndexOf = (iso: string): number => {
    const d = new Date(iso);
    return d.getDate() - 1;
  };

  const handleBarClick = (e: React.MouseEvent, r: Reservation) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopover({ res: r, x: rect.left, y: rect.bottom + 6 });
  };

  const filteredRooms = useMemo(() => {
    if (selectedRoomId === 'all') return data.rooms;
    return data.rooms.filter((room) => room.id === selectedRoomId);
  }, [data.rooms, selectedRoomId]);

  // Calendar Month Grid for Selected Single Room Focus View
  const gridCells = useMemo(() => {
    if (selectedRoomId === 'all') return [];
    
    // Get start day of month (Monday index 0 to Sunday index 6)
    const tempDate = new Date(year, month, 1);
    const startDayOfWeek = tempDate.getDay();
    const mondayStartOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const cells: ({ dayNum: number | null; iso: string | null }[]) = [];

    // Prefix empty slots
    for (let i = 0; i < mondayStartOffset; i++) {
      cells.push({ dayNum: null, iso: null });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cells.push({ dayNum: i, iso });
    }

    // Pad end of month to make full weeks
    while (cells.length % 7 !== 0) {
      cells.push({ dayNum: null, iso: null });
    }

    return cells;
  }, [selectedRoomId, year, month, daysInMonth]);

  const weekDays = lang === 'ar' 
    ? ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
    : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex flex-col text-white select-none overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 45%, #0284c7 100%)' }}
      >
        {/* Fullscreen Title Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/15 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 border border-white/10 shadow-inner">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">{t('res.timelineTitle')}</h1>
              <p className="text-xs text-sky-200/80 font-medium">{monthLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Apartment Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-colors">
              <Building2 size={15} className="text-sky-300" />
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="bg-transparent border-0 text-xs font-semibold text-white focus:outline-none focus:ring-0 cursor-pointer pr-4"
              >
                <option value="all" className="bg-slate-900 text-white">{t('common.all')} ({t('nav.chambres')})</option>
                {data.rooms.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.name} · {categoryName(data, r.categoryId)}
                  </option>
                ))}
              </select>
            </div>

            {/* Close Button */}
            <button
              onClick={() => { setPopover(null); onClose(); }}
              className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-200 flex items-center justify-center transition-all duration-200 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Sub-Header Actions & Filters */}
        <section className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-black/10 border-b border-white/10">
          {/* Status Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'pending', 'active', 'paid', 'debt'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95',
                  statusFilter === s
                    ? 'bg-gradient-to-r from-[var(--color-saas-primary-start)] via-[var(--color-saas-primary-via)] to-[var(--color-saas-primary-end)] text-white shadow-glow border-none'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                {s === 'all' ? t('common.all') : t(`res.status${s.charAt(0).toUpperCase() + s.slice(1)}` as `res.status${string}`)}
              </button>
            ))}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <GradientButton variant="glass" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setMonthOffset((o) => o - 1)} className="border-white/10 text-white hover:bg-white/10" />
            <span className="text-sm font-bold text-white min-w-[140px] text-center">{monthLabel}</span>
            <GradientButton variant="glass" size="sm" onClick={() => setMonthOffset(0)} className="border-white/10 text-white hover:bg-white/10">{t('common.today')}</GradientButton>
            <GradientButton variant="glass" size="sm" icon={<ChevronRight size={16} />} onClick={() => setMonthOffset((o) => o + 1)} className="border-white/10 text-white hover:bg-white/10" />
          </div>
        </section>

        {/* Main Workspace Area (Scrollable timeline or split timeline+grid) */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6" onClick={() => setPopover(null)}>
          
          {/* Timeline Grid Container */}
          <div className="rounded-2xl border border-white/10 bg-black/20 shadow-2xl overflow-hidden">
            <div ref={scrollRef} className="overflow-x-auto">
              <div style={{ minWidth: 200 + daysInMonth * CELL }}>
                {/* Day Header Row */}
                <div className="flex bg-slate-900/60 border-b border-white/10 py-2 sticky top-0 z-10">
                  <div className="w-[200px] shrink-0 px-4 flex items-center gap-1.5 text-xs font-bold text-sky-200 uppercase tracking-wider border-e border-white/10">
                    <Building2 size={14} className="text-sky-305 text-sky-300" />
                    {t('nav.chambres')}
                  </div>
                  {days.map((d) => (
                    <div
                      key={d.iso}
                      style={{ width: CELL }}
                      className={cn('shrink-0 text-center flex flex-col items-center justify-center', d.isWeekend && 'opacity-70')}
                    >
                      <p className={cn('text-[9px] font-bold uppercase tracking-wider', d.isToday ? 'text-sky-355 text-sky-300' : 'text-slate-350 text-slate-300')}>
                        {d.weekday}
                      </p>
                      <div className={cn(
                        'mt-1 h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                        d.isToday ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-400/30' : 'text-white',
                      )}>
                        {d.num}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rooms Rows */}
                <div className="divide-y divide-white/5">
                  {filteredRooms.map((room) => {
                    const roomRes = data.reservations.filter((r) => {
                      if (r.status === 'cancelled') return false;
                      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
                      if (!r.rooms.some((rr) => rr.roomId === room.id)) return false;
                      return r.checkIn <= monthEnd && r.checkOut > monthStart;
                    });

                    return (
                      <div key={room.id} className="flex items-center hover:bg-white/5 transition-colors group">
                        {/* Room label side cell */}
                        <div className="w-[200px] shrink-0 px-4 py-3 border-e border-white/10 group-hover:bg-white/5 transition-colors">
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                            {room.name}
                          </p>
                          <p className="text-[10px] text-sky-200/60 truncate font-semibold mt-0.5 ml-3.5">
                            {categoryName(data, room.categoryId)}
                          </p>
                        </div>

                        {/* Room Track area */}
                        <div
                          className="relative flex-1 h-14"
                          style={{ width: daysInMonth * CELL }}
                        >
                          {/* Daily grid cells */}
                          {days.map((d, i) => (
                            <div
                              key={d.iso}
                              className={cn(
                                'absolute top-0 bottom-0 border-e border-white/5 transition-all',
                                d.isWeekend && 'bg-white/5',
                                d.isToday && 'bg-sky-500/10',
                              )}
                              style={{ left: i * CELL, width: CELL }}
                            />
                          ))}

                          {/* Maintenance Overlay */}
                          {room.status === 'maintenance' && (
                            <div
                              className="absolute inset-0 opacity-15 pointer-events-none"
                              style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 5px, transparent 5px, transparent 10px)' }}
                            />
                          )}

                          {/* Reservation blocks */}
                          <AnimatePresence>
                            {roomRes.map((r) => {
                              const startDay = Math.max(0, dayIndexOf(r.checkIn));
                              const endDay = Math.min(daysInMonth, dayIndexOf(r.checkOut));
                              const width = Math.max(1, endDay - startDay) * CELL - 4;
                              const barColor = getResBgColor(r.code);

                              return (
                                <motion.button
                                  key={r.id}
                                  initial={{ scaleX: 0, originX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  exit={{ scaleX: 0, opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                                  className={cn(
                                    'absolute top-2 bottom-2 rounded-lg px-2.5 text-[10px] font-bold truncate border shadow-lg hover:scale-[1.01] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-start bg-gradient-to-r',
                                    barColor,
                                  )}
                                  style={{ left: startDay * CELL + 2, width }}
                                  onClick={(e) => handleBarClick(e, r)}
                                  title={`${r.code} · ${clientName(data, r.clientId)}`}
                                >
                                  <span className="truncate">{r.code} · {clientName(data, r.clientId)}</span>
                                </motion.button>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Month Grid Calendar Focus View for Single Apartment Mode */}
          {selectedRoomId !== 'all' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-black/25 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-sky-300" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Calendrier Mensuel de l'Appartement
                </h3>
              </div>

              {/* Day names header */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-sky-200/80">
                {weekDays.map((wd) => (
                  <div key={wd} className="py-2 bg-slate-900/35 border border-white/5 rounded-xl">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Date grid cells */}
              <div className="grid grid-cols-7 gap-2">
                {gridCells.map((cell, idx) => {
                  if (cell.dayNum === null || !cell.iso) {
                    return <div key={`empty-${idx}`} className="aspect-video bg-white/5 border border-white/5 rounded-xl opacity-30" />;
                  }

                  // Find reservation matching this date for the selected room
                  const roomRes = data.reservations.filter((r) => {
                    if (r.status === 'cancelled') return false;
                    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
                    return r.rooms.some((rr) => rr.roomId === selectedRoomId);
                  });

                  const activeRes = roomRes.find((r) => cell.iso && r.checkIn <= cell.iso && r.checkOut > cell.iso);
                  const isToday = cell.iso === today;

                  return (
                    <div
                      key={cell.iso}
                      className={cn(
                        'relative aspect-video rounded-xl p-2 flex flex-col justify-between border transition-all',
                        isToday ? 'border-sky-400 bg-sky-500/10' : 'border-white/5 bg-white/5',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center',
                          isToday ? 'bg-sky-400 text-slate-950 font-black' : 'text-slate-350',
                        )}>
                          {cell.dayNum}
                        </span>
                        {activeRes && (
                          <ResStatusBadge status={activeRes.status} dark />
                        )}
                      </div>

                      {activeRes ? (
                        <button
                          onClick={(e) => handleBarClick(e, activeRes)}
                          className={cn(
                            'w-full text-start text-[10px] font-bold p-1 rounded border truncate bg-gradient-to-r hover:brightness-110 active:scale-95 transition-all',
                            getResBgColor(activeRes.code),
                          )}
                        >
                          <span className="block truncate font-extrabold">{activeRes.code}</span>
                          <span className="block truncate opacity-85 font-medium">{clientName(data, activeRes.clientId)}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-semibold italic text-center py-2">Disponible</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Color coding details / Legends */}
          <div className="flex flex-wrap gap-4 pt-3 border-t border-white/10 px-3">
            <Legend colorClass="bg-gradient-to-r from-violet-500 to-purple-500" label={t('res.statusPending')} />
            <Legend colorClass="bg-gradient-to-r from-sky-500 to-cyan-500" label={t('res.statusActive')} />
            <Legend colorClass="bg-gradient-to-r from-emerald-500 to-teal-500" label={t('res.statusPaid')} />
            <Legend colorClass="bg-gradient-to-r from-amber-500 to-orange-500" label={t('res.statusDebt')} />
            <Legend colorClass="bg-slate-400" label={t('res.statusCancelled')} />
            <span className="flex items-center gap-1.5 text-xs text-sky-200/80">
              <span className="h-3 w-5 rounded border border-white/10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, transparent 4px, transparent 8px)', opacity: 0.4 }} />
              {t('rooms.maintenance')}
            </span>
          </div>
        </main>

        {/* Popover detailed info card */}
        <AnimatePresence>
          {popover && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              className="fixed z-50 w-72 rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-2xl text-white backdrop-blur-md bg-opacity-95"
              style={{
                top: Math.min(popover.y, window.innerHeight - 280),
                left: Math.min(popover.x, window.innerWidth - 300),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">{popover.res.code}</span>
                  <ResStatusBadge status={popover.res.status} />
                </div>
                <button onClick={() => setPopover(null)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User size={13} className="text-sky-305 text-sky-300 shrink-0" />
                  <span className="font-semibold text-white truncate">{clientName(data, popover.res.clientId)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone size={13} className="text-sky-305 text-sky-300 shrink-0" />
                  <span className="truncate">{clientById(data, popover.res.clientId)?.phone ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CalendarDays size={13} className="text-sky-305 text-sky-300 shrink-0" />
                  <span className="truncate">{popover.res.checkIn} → {popover.res.checkOut} · {popover.res.nights} {t('common.nights')}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-slate-400 text-xs">Total</span>
                  <span className="font-extrabold text-white">{formatDA(popover.res.total)}</span>
                </div>
                {reservationRemaining(popover.res) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs">Reste dû</span>
                    <span className="font-extrabold text-amber-400">{formatDA(reservationRemaining(popover.res))}</span>
                  </div>
                )}
              </div>
              <GradientButton
                size="sm"
                fullWidth
                className="mt-4"
                onClick={() => { setPopover(null); onSelect(popover.res); }}
              >
                {t('common.details')}
              </GradientButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-sky-200/80">
      <span className={cn('h-3 w-5 rounded border border-white/10', colorClass)} />
      {label}
    </span>
  );
}
