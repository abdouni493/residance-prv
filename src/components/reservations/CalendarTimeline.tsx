import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, BedDouble } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { GradientButton } from '@/components/ui/GradientButton';
import { SegmentedControl } from '@/components/ui/Field';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { cn, todayISO } from '@/lib/utils';
import { categoryName, clientName } from '@/lib/lookups';
import type { Reservation } from '@/types';

const CELL = 46;

export function CalendarTimeline({
  open, onClose, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (r: Reservation) => void;
}) {
  const { t, lang } = useI18n();
  const data = useAppData();
  const [span, setSpan] = useState<'14' | '30'>('14');
  const [startOffset, setStartOffset] = useState(0);

  const days = Number(span);
  const start = useMemo(() => {
    const d = new Date(todayISO());
    d.setDate(d.getDate() + startOffset);
    return d;
  }, [startOffset]);

  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [start, days],
  );
  const startISO = start.toISOString().slice(0, 10);
  const endISO = dates[dates.length - 1].toISOString().slice(0, 10);

  const dayIndex = (iso: string) => {
    const d = new Date(iso);
    return Math.round((d.getTime() - start.getTime()) / 86400000);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('res.timelineTitle')}
      subtitle={`${dates[0]?.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'short' })} → ${dates[days - 1]?.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { day: 'numeric', month: 'short' })}`}
      width="max-w-[min(96vw,1100px)]"
      footer={
        <div className="flex items-center justify-between">
          <SegmentedControl<'14' | '30'>
            value={span}
            onChange={setSpan}
            size="sm"
            options={[{ value: '14', label: '2 ' + t('common.week') }, { value: '30', label: t('common.month') }]}
          />
          <div className="flex items-center gap-2">
            <GradientButton variant="glass" size="sm" icon={<ChevronLeft size={16} />} onClick={() => setStartOffset((o) => o - days)} />
            <GradientButton variant="glass" size="sm" onClick={() => setStartOffset(0)}>{t('common.today')}</GradientButton>
            <GradientButton variant="glass" size="sm" icon={<ChevronRight size={16} />} onClick={() => setStartOffset((o) => o + days)} />
          </div>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <div style={{ minWidth: 140 + days * CELL }}>
          {/* Header */}
          <div className="flex sticky top-0 z-10">
            <div className="w-[140px] shrink-0" />
            {dates.map((d, i) => {
              const isToday = d.toISOString().slice(0, 10) === todayISO();
              const weekend = d.getDay() === 5 || d.getDay() === 6;
              return (
                <div key={i} style={{ width: CELL }} className={cn('shrink-0 text-center pb-2', weekend && 'opacity-70')}>
                  <p className={cn('text-[10px] uppercase', isToday ? 'text-brand-600 font-bold' : 'text-ink-muted')}>
                    {d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { weekday: 'narrow' })}
                  </p>
                  <p className={cn('text-sm font-semibold', isToday ? 'text-brand-600' : 'text-ink-secondary')}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {data.rooms.map((room) => {
              const roomRes = data.reservations.filter(
                (r) => r.status !== 'cancelled' && r.rooms.some((rr) => rr.roomId === room.id) && r.checkIn < endISO && r.checkOut > startISO,
              );
              return (
                <div key={room.id} className="flex items-center">
                  <div className="w-[140px] shrink-0 pe-3">
                    <p className="text-sm font-semibold text-ink-primary flex items-center gap-1.5">
                      <BedDouble size={14} className="text-ink-muted" /> {room.name}
                    </p>
                    <p className="text-[10px] text-ink-muted truncate">{categoryName(data, room.categoryId)}</p>
                  </div>
                  <div className="relative flex-1 h-11 rounded-lg bg-white/[0.03] border border-slate-200/70" style={{ width: days * CELL }}>
                    {/* maintenance hatch */}
                    {room.status === 'maintenance' && (
                      <div className="absolute inset-0 rounded-lg opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #F59E0B, #F59E0B 6px, transparent 6px, transparent 12px)' }} />
                    )}
                    {/* day separators */}
                    {Array.from({ length: days }).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-e border-slate-200/70" style={{ left: i * CELL, width: CELL }} />
                    ))}
                    {/* reservation blocks */}
                    {roomRes.map((r) => {
                      const startIdx = Math.max(0, dayIndex(r.checkIn));
                      const endIdx = Math.min(days, dayIndex(r.checkOut));
                      const width = Math.max(1, endIdx - startIdx) * CELL - 4;
                      const color = r.status === 'debt' ? 'bg-grad-warning' : r.status === 'active' ? 'bg-grad-secondary' : 'bg-grad-success';
                      return (
                        <button
                          key={r.id}
                          onClick={() => onSelect(r)}
                          className={cn('absolute top-1 bottom-1 rounded-md px-2 text-[10px] font-semibold text-white truncate shadow-md hover:brightness-110 transition-all', color)}
                          style={{ left: startIdx * CELL + 2, width }}
                          title={`${r.code} · ${clientName(data, r.clientId)}`}
                        >
                          {clientName(data, r.clientId)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-200">
            <Legend className="bg-grad-success" label={t('res.statusPaid')} />
            <Legend className="bg-grad-secondary" label={t('res.statusActive')} />
            <Legend className="bg-grad-warning" label={t('res.statusDebt')} />
            <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span className="h-3 w-5 rounded" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #F59E0B, #F59E0B 4px, transparent 4px, transparent 8px)' }} />
              {t('rooms.maintenance')}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
      <span className={cn('h-3 w-5 rounded', className)} />
      {label}
    </span>
  );
}
