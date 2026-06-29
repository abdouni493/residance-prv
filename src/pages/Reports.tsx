import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, FileText, Printer, Sparkles, ChevronDown, CalendarCheck, Users,
  BedDouble, Wrench, TrendingDown, HardHat, Landmark,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { PageHeader, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { buildReportData, buildReportHTML, type ReportData } from '@/lib/report';
import { printHTML } from '@/lib/print';
import { reservationPaid } from '@/store/selectors';
import { formatDA, formatDate, todayISO, addDaysISO, cn } from '@/lib/utils';
import { clientName } from '@/lib/lookups';

export default function Reports() {
  const { t, lang } = useI18n();
  const data = useAppData();
  const storeInfo = useApp((s) => s.storeInfo);
  const perms = useCurrentPermissions();

  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = () => {
    setLoading(true);
    setReport(null);
    setTimeout(() => {
      setReport(buildReportData(data, from, to));
      setLoading(false);
    }, 900);
  };

  const print = () => {
    if (report) printHTML('Rapport', buildReportHTML(data, report, storeInfo, from, to));
  };

  // Generate an initial report on first load so the page isn't blank.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        icon={<BarChart3 size={24} />}
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        actions={
          report && can(perms, 'reports', 'print') && (
            <GradientButton variant="glass" icon={<Printer size={18} />} onClick={print}>{t('reports.printReport')}</GradientButton>
          )
        }
      />

      <GradientCard className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 w-full" />
          <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 w-full" />
          <GradientButton icon={<Sparkles size={18} />} onClick={generate} glow>{t('reports.generate')}</GradientButton>
        </div>
      </GradientCard>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div className="h-full bg-grad-primary" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 0.9 }} />
                </div>
                <span className="text-sm text-ink-secondary">{t('reports.generating')}</span>
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </motion.div>
        ) : report ? (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* 1. Exec summary */}
            <Section title={t('reports.execSummary')} icon={<FileText size={18} />} defaultOpen>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={t('reports.totalRevenue')} value={formatDA(report.totalRevenue)} tone="success" />
                <Stat label={t('reports.totalExpenses')} value={formatDA(report.totalExpenses)} tone="danger" />
                <Stat label={t('reports.netGain')} value={formatDA(report.netGain)} tone={report.netGain >= 0 ? 'success' : 'danger'} />
                <Stat label={t('reports.avgOccupancy')} value={`${report.avgOccupancy}%`} />
              </div>
            </Section>

            {/* 2. Reservations */}
            <Section title={t('reports.reservations')} icon={<CalendarCheck size={18} />}>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge tone="neutral">{t('common.total')}: {report.reservations.total}</Badge>
                <Badge tone="success">{t('res.statusPaid')}: {report.reservations.paid}</Badge>
                <Badge tone="danger">{t('res.statusDebt')}: {report.reservations.debt}</Badge>
                <Badge tone="neutral">{t('res.statusCancelled')}: {report.reservations.cancelled}</Badge>
                {report.reservations.topClient && (
                  <Badge tone="purple">★ {report.reservations.topClient.name}</Badge>
                )}
              </div>
              <ReportTable
                head={['Code', t('clients.title'), t('res.checkIn'), t('common.nights'), t('common.total'), t('common.paid')]}
                rows={report.reservations.list.slice(0, 12).map((r) => [
                  r.code, clientName(data, r.clientId), formatDate(r.checkIn, lang), String(r.nights), formatDA(r.total), formatDA(reservationPaid(r)),
                ])}
              />
            </Section>

            {/* 3. Clients */}
            <Section title={t('reports.clients')} icon={<Users size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('reports.topClients')}</p>
                  {report.clients.top.map((c, i) => (
                    <div key={c.name} className="flex justify-between text-sm py-1.5 border-b border-slate-200/70">
                      <span className="text-ink-secondary">{i + 1}. {c.name}</span>
                      <span className="text-ink-primary font-medium">{formatDA(c.total)}</span>
                    </div>
                  ))}
                  <p className="text-xs text-ink-muted mt-2">{t('reports.newClients')}: {report.clients.newCount}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('dash.debts')} ({formatDA(report.clients.totalDebt)})</p>
                  {report.clients.debts.slice(0, 6).map((d) => (
                    <div key={d.name} className="flex justify-between text-sm py-1.5 border-b border-slate-200/70">
                      <span className="text-ink-secondary">{d.name}</span>
                      <span className="text-rose-600 font-medium">{formatDA(d.amount)}</span>
                    </div>
                  ))}
                  {report.clients.debts.length === 0 && <p className="text-sm text-ink-muted">—</p>}
                </div>
              </div>
            </Section>

            {/* 4. Rooms */}
            <Section title={t('reports.rooms')} icon={<BedDouble size={18} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-ink-muted uppercase mb-2">{t('dash.occupancyByFloor')}</p>
                  {report.rooms.occupancy.map((o) => (
                    <div key={o.name} className="flex items-center gap-2 py-1.5">
                      <span className="text-sm text-ink-secondary w-20">{o.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-grad-cyan" style={{ width: `${o.rate}%` }} />
                      </div>
                      <span className="text-xs text-ink-primary w-10 text-end">{o.rate}%</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Stat label={t('reports.mostProfitableRoom')} value={report.rooms.mostProfitable ? `${report.rooms.mostProfitable.name} · ${formatDA(report.rooms.mostProfitable.revenue)}` : '—'} tone="success" />
                  <Stat label={t('expenses.tabMaintenance')} value={`${report.rooms.maintenances.length} · ${formatDA(report.rooms.maintTotal)}`} tone="danger" />
                  <p className="text-xs font-bold text-ink-muted uppercase mt-2 mb-1">{t('reports.nightsSold')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.reservations.nightsSold.slice(0, 8).map((n) => (
                      <span key={n.name} className="text-xs rounded-md bg-slate-100/70 border border-slate-200 px-2 py-1 text-ink-secondary">{n.name}: {n.nights}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* 5. Services */}
            <Section title={t('reports.services')} icon={<Sparkles size={18} />}>
              <ReportTable
                head={[t('common.name'), t('common.total'), 'CA']}
                rows={report.services.sold.map((s) => [s.name, String(s.qty), formatDA(s.revenue)])}
                empty={report.services.sold.length === 0}
              />
            </Section>

            {/* 6. Expenses */}
            <Section title={t('reports.expensesDetail')} icon={<TrendingDown size={18} />}>
              <ReportTable
                head={[t('common.category'), t('common.amount')]}
                rows={report.expensesDetail.byCategory.map((c) => [c.name, formatDA(c.total)])}
                empty={report.expensesDetail.byCategory.length === 0}
              />
              <p className="text-sm text-ink-secondary mt-2 flex items-center gap-1.5"><Wrench size={14} /> {t('caisse.maintenances')}: <span className="text-rose-600 font-semibold">{formatDA(report.rooms.maintTotal)}</span></p>
            </Section>

            {/* 7. Staff */}
            <Section title={t('reports.staff')} icon={<HardHat size={18} />}>
              <ReportTable
                head={[t('nav.workers'), t('common.paid')]}
                rows={report.staff.payments.map((p) => [p.name, formatDA(p.total)])}
                empty={report.staff.payments.length === 0}
              />
              <p className="text-xs text-ink-muted mt-2">{t('workers.advances')}: {formatDA(report.staff.advances)} · {t('workers.absences')}: {report.staff.absences}</p>
            </Section>

            {/* 8. Caisse */}
            <Section title={t('reports.caisse')} icon={<Landmark size={18} />}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Stat label={t('caisse.totalIn')} value={formatDA(report.caisse.totalIn)} tone="success" />
                <Stat label={t('caisse.totalOut')} value={formatDA(report.caisse.totalOut)} tone="danger" />
                <Stat label={t('caisse.netBalance')} value={formatDA(report.caisse.net)} tone={report.caisse.net >= 0 ? 'success' : 'danger'} />
              </div>
            </Section>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center text-center py-20">
            <div className="grid h-20 w-20 place-items-center rounded-3xl glass border border-slate-200 text-brand-400 mb-4"><BarChart3 size={36} /></div>
            <h3 className="text-lg font-bold text-ink-primary">{t('reports.title')}</h3>
            <p className="text-sm text-ink-secondary mt-1 max-w-sm">{t('reports.subtitle')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="glass rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 hover:bg-slate-100/70 transition-colors">
        <span className="flex items-center gap-3 font-bold text-ink-primary">
          <span className="text-brand-400">{icon}</span> {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={18} className="text-ink-muted" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty?: boolean }) {
  const { t } = useI18n();
  if (empty || rows.length === 0) return <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {head.map((h, i) => <th key={h} className={cn('py-2 px-3 text-xs font-semibold text-ink-muted uppercase', i === 0 ? 'text-start' : 'text-end')}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-slate-200/70">
              {row.map((cell, ci) => <td key={ci} className={cn('py-2 px-3', ci === 0 ? 'text-start text-ink-primary font-medium' : 'text-end text-ink-secondary')}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
