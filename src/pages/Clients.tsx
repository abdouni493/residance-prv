import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Phone, Mail, IdCard, MapPin, History, BedDouble,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, SearchInput, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ClientForm, type ClientFormData } from '@/components/forms/ClientForm';
import { ResStatusBadge } from '@/components/ResStatusBadge';
import { CountBarChart } from '@/components/ui/Charts';
import { clientStats, reservationRemaining } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, initials, monthKey } from '@/lib/utils';
import { reservationRoomLabels } from '@/lib/lookups';
import type { Client } from '@/types';

export default function Clients() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const addClient = useApp((s) => s.addClient);
  const updateClient = useApp((s) => s.updateClient);
  const deleteClient = useApp((s) => s.deleteClient);
  const perms = useCurrentPermissions();

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.clients;
    return data.clients.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [data.clients, search]);

  const save = async (form: ClientFormData) => {
    if (editing) {
      await updateClient(editing.id, form);
      toast.success(t('toast.updated'));
    } else {
      await addClient(form);
      toast.success(t('toast.created'));
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        icon={<Users size={24} />}
        title={t('clients.title')}
        subtitle={t('clients.subtitle')}
        actions={
          can(perms, 'clients', 'create') && (
            <GradientButton icon={<Plus size={18} />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              {t('clients.new')}
            </GradientButton>
          )
        }
      />

      <div className="mb-5 max-w-md">
        <SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((c) => {
              const stats = clientStats(c.id, data.reservations);
              return (
                <motion.div key={c.id} variants={listItem} layout exit="exit">
                  <GradientCard className="p-5 h-full flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-grad-rose text-white font-bold shrink-0">
                        {initials(`${c.firstName} ${c.lastName}`)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-ink-primary truncate">{c.firstName} {c.lastName}</h3>
                        <p className="text-xs text-ink-muted truncate">{c.profession || '—'}</p>
                      </div>
                      {stats.totalDebt > 0 && (
                        <span className="text-xs font-semibold text-rose-600 bg-rose-500/10 border border-rose-400/30 rounded-full px-2 py-0.5 shrink-0">
                          {formatDA(stats.totalDebt)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 text-sm text-ink-secondary flex-1">
                      <p className="flex items-center gap-2"><Phone size={14} className="text-ink-muted" /> {c.phone}</p>
                      {c.email && <p className="flex items-center gap-2 truncate"><Mail size={14} className="text-ink-muted shrink-0" /> <span className="truncate">{c.email}</span></p>}
                      <p className="flex items-center gap-2"><IdCard size={14} className="text-ink-muted" /> {c.documentNumber || '—'}</p>
                      <p className="flex items-center gap-2"><MapPin size={14} className="text-ink-muted" /> {c.city || '—'}</p>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 border-t border-slate-200 pt-3">
                      <GradientButton size="sm" variant="glass" icon={<History size={15} />} onClick={() => setHistoryClient(c)}>
                        {t('common.history')}
                      </GradientButton>
                      <div className="flex-1" />
                      {can(perms, 'clients', 'edit') && (
                        <button onClick={() => { setEditing(c); setFormOpen(true); }} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-brand-600 hover:bg-slate-100 transition-colors">
                          <Pencil size={16} />
                        </button>
                      )}
                      {can(perms, 'clients', 'delete') && (
                        <button onClick={() => setToDelete(c)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors">
                          <Trash2 size={16} />
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

      {/* Form drawer */}
      <Drawer
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? `${editing.firstName} ${editing.lastName}` : t('clients.new')}
        subtitle={t('clients.personalInfo')}
        width="max-w-3xl"
      >
        <ClientForm
          initial={editing ?? undefined}
          onSave={save}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      </Drawer>

      {/* History modal */}
      <ClientHistory client={historyClient} onClose={() => setHistoryClient(null)} data={data} lang={lang} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) { await deleteClient(toDelete.id); toast.success(t('toast.deleted')); }
        }}
        message={toDelete ? `${t('common.deleteMsg')} (${toDelete.firstName} ${toDelete.lastName})` : ''}
      />
    </div>
  );
}

function ClientHistory({
  client,
  onClose,
  data,
  lang,
}: {
  client: Client | null;
  onClose: () => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const reservations = useMemo(
    () => (client ? data.reservations.filter((r) => r.clientId === client.id) : []),
    [client, data.reservations],
  );
  const stats = client ? clientStats(client.id, data.reservations) : null;

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reservations) {
      if (r.status === 'cancelled') continue;
      const mk = monthKey(r.checkIn);
      map.set(mk, (map.get(mk) ?? 0) + r.total);
    }
    return [...map.entries()]
      .sort()
      .slice(-6)
      .map(([mk, value]) => {
        const [y, m] = mk.split('-').map(Number);
        return { name: new Date(y, m - 1).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { month: 'short' }), value };
      });
  }, [reservations, lang]);

  return (
    <Modal
      open={!!client}
      onClose={onClose}
      title={client ? `${client.firstName} ${client.lastName}` : ''}
      subtitle={t('common.history')}
      size="lg"
    >
      {client && stats && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('clients.reservationsCount')} value={stats.reservations} />
            <Stat label={t('clients.totalSpent')} value={formatDA(stats.totalSpent)} />
            <Stat label={t('common.paid')} value={formatDA(stats.totalPaid)} tone="success" />
            <Stat label={t('clients.totalDebt')} value={formatDA(stats.totalDebt)} tone={stats.totalDebt > 0 ? 'danger' : 'default'} />
          </div>

          {monthly.length > 0 && (
            <div className="glass rounded-2xl border border-slate-200 p-4">
              <CountBarChart data={monthly} color="#F43F5E" />
            </div>
          )}

          <div className="space-y-2">
            {reservations.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-6">{t('common.noData')}</p>
            ) : (
              reservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-primary">{r.code} · {reservationRoomLabels(data, r)}</p>
                    <p className="text-xs text-ink-muted">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)} · {r.nights} {t('common.nights')}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-sm font-bold text-ink-primary">{formatDA(r.total)}</p>
                    <div className="mt-1 flex items-center gap-1.5 justify-end">
                      {reservationRemaining(r) > 0 && r.status !== 'cancelled' && (
                        <span className="text-[11px] text-rose-600">{t('common.remaining')} {formatDA(reservationRemaining(r))}</span>
                      )}
                      <ResStatusBadge status={r.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
