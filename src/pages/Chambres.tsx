import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BedDouble, Plus, Pencil, Trash2, Wrench, Eye, Layers, Tag, Users, Check, X, Wallet,
} from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useAppData } from '@/store/hooks';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState, Stat } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, SelectField, SegmentedControl, TextArea } from '@/components/ui/Field';
import { effectiveRoomStatus, reservationPaid } from '@/store/selectors';
import { staggerContainer, listItem } from '@/animations';
import { formatDA, formatDate, todayISO, addDaysISO, nightsBetween } from '@/lib/utils';
import { categoryName, floorName, clientName } from '@/lib/lookups';
import type { Room, RoomStatus } from '@/types';

type Filter = 'all' | RoomStatus;

export default function Chambres() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const data = useAppData();
  const perms = useCurrentPermissions();
  const { rooms, floors, categories } = data;

  const addRoom = useApp((s) => s.addRoom);
  const updateRoom = useApp((s) => s.updateRoom);
  const deleteRoom = useApp((s) => s.deleteRoom);
  const setRoomMaintenance = useApp((s) => s.setRoomMaintenance);
  const endRoomMaintenance = useApp((s) => s.endRoomMaintenance);
  const addFloor = useApp((s) => s.addFloor);
  const deleteFloor = useApp((s) => s.deleteFloor);
  const addCategory = useApp((s) => s.addCategory);
  const deleteCategory = useApp((s) => s.deleteCategory);

  const today = todayISO();
  const [filter, setFilter] = useState<Filter>('all');
  const [formRoom, setFormRoom] = useState<Room | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [manageFloors, setManageFloors] = useState(false);
  const [manageCats, setManageCats] = useState(false);
  const [toDelete, setToDelete] = useState<Room | null>(null);
  const [maintRoom, setMaintRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);

  const withStatus = useMemo(
    () => rooms.map((r) => ({ room: r, status: effectiveRoomStatus(r, data.reservations, today) })),
    [rooms, data.reservations, today],
  );
  const filtered = useMemo(
    () => (filter === 'all' ? withStatus : withStatus.filter((x) => x.status === filter)),
    [withStatus, filter],
  );

  return (
    <div>
      <PageHeader
        icon={<BedDouble size={24} />}
        title={t('rooms.title')}
        subtitle={t('rooms.subtitle')}
        actions={
          can(perms, 'chambres', 'create') && (
            <>
              <GradientButton variant="glass" icon={<Layers size={17} />} onClick={() => setManageFloors(true)}>
                {t('rooms.manageFloors')}
              </GradientButton>
              <GradientButton variant="glass" icon={<Tag size={17} />} onClick={() => setManageCats(true)}>
                {t('rooms.manageCategories')}
              </GradientButton>
              <GradientButton icon={<Plus size={18} />} onClick={() => { setFormRoom(null); setFormOpen(true); }}>
                {t('rooms.new')}
              </GradientButton>
            </>
          )
        }
      />

      <div className="mb-5">
        <SegmentedControl<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'available', label: t('rooms.available') },
            { value: 'occupied', label: t('rooms.occupied') },
            { value: 'maintenance', label: t('rooms.maintenance') },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BedDouble size={36} />} title={t('common.noResults')} hint={t('common.emptyHint')} />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(({ room, status }) => (
              <motion.div key={room.id} variants={listItem} layout exit="exit">
                <GradientCard className="p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-grad-primary text-white shadow-lg shrink-0">
                        <BedDouble size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-ink-primary text-lg">{room.name}</h3>
                        <p className="text-xs text-ink-muted">{categoryName(data, room.categoryId)} · {floorName(data, room.floorId)}</p>
                      </div>
                    </div>
                    <RoomStatusBadge status={status} />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <Users size={15} className="text-ink-muted" /> {room.capacity} {t('common.persons')}
                    </span>
                    <span className="text-lg font-extrabold text-gradient">{formatDA(room.pricePerNight)}<span className="text-xs text-ink-muted font-medium"> / {t('common.night')}</span></span>
                  </div>

                  {status === 'maintenance' && room.maintenanceNote && (
                    <p className="mt-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1.5">{room.maintenanceNote}</p>
                  )}

                  <div className="mt-4 flex items-center gap-1.5 border-t border-slate-200 pt-3">
                    <GradientButton size="sm" variant="glass" icon={<Eye size={15} />} onClick={() => setDetailRoom(room)}>
                      {t('common.details')}
                    </GradientButton>
                    <div className="flex-1" />
                    {can(perms, 'chambres', 'edit') && status !== 'maintenance' && (
                      <button onClick={() => setMaintRoom(room)} title={t('rooms.setMaintenance')} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-amber-600 hover:bg-amber-500/10 transition-colors">
                        <Wrench size={16} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'edit') && status === 'maintenance' && (
                      <button onClick={async () => { await endRoomMaintenance(room.id); toast.success(t('toast.updated')); }} title={t('rooms.endMaintenance')} className="grid h-9 w-9 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors">
                        <Check size={16} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'edit') && (
                      <button onClick={() => { setFormRoom(room); setFormOpen(true); }} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-brand-600 hover:bg-slate-100 transition-colors">
                        <Pencil size={16} />
                      </button>
                    )}
                    {can(perms, 'chambres', 'delete') && (
                      <button onClick={() => setToDelete(room)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {formOpen && (
        <RoomFormModal
          room={formRoom}
          floors={floors}
          categories={categories}
          onAddFloor={addFloor}
          onAddCategory={addCategory}
          onClose={() => setFormOpen(false)}
          onSave={async (payload) => {
            if (formRoom) { await updateRoom(formRoom.id, payload); toast.success(t('toast.updated')); }
            else { await addRoom(payload); toast.success(t('toast.created')); }
            setFormOpen(false);
          }}
        />
      )}

      <ManageListModal
        open={manageFloors}
        onClose={() => setManageFloors(false)}
        title={t('rooms.manageFloors')}
        items={floors}
        onAdd={async (name) => { await addFloor(name); toast.success(t('toast.created')); }}
        onDelete={async (id) => { await deleteFloor(id); toast.success(t('toast.deleted')); }}
        placeholder={t('rooms.newFloor')}
      />
      <ManageListModal
        open={manageCats}
        onClose={() => setManageCats(false)}
        title={t('rooms.manageCategories')}
        items={categories}
        onAdd={async (name) => { await addCategory(name); toast.success(t('toast.created')); }}
        onDelete={async (id) => { await deleteCategory(id); toast.success(t('toast.deleted')); }}
        placeholder={t('rooms.newCategory')}
      />

      <MaintenanceModal
        room={maintRoom}
        onClose={() => setMaintRoom(null)}
        onConfirm={async (note) => {
          if (maintRoom) { await setRoomMaintenance(maintRoom.id, note); toast.success(t('toast.updated')); }
          setMaintRoom(null);
        }}
      />

      <RoomDetailsModal room={detailRoom} onClose={() => setDetailRoom(null)} data={data} lang={lang} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { await deleteRoom(toDelete.id); toast.success(t('toast.deleted')); } }}
        message={toDelete ? `${t('common.deleteMsg')} (${t('nav.chambres')} ${toDelete.name})` : ''}
      />
    </div>
  );
}

function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { t } = useI18n();
  if (status === 'available') return <Badge tone="success" dot>{t('rooms.available')}</Badge>;
  if (status === 'occupied') return <Badge tone="danger" dot>{t('rooms.occupied')}</Badge>;
  return <Badge tone="warning" dot>{t('rooms.maintenance')}</Badge>;
}

function RoomFormModal({
  room, floors, categories, onAddFloor, onAddCategory, onClose, onSave,
}: {
  room: Room | null;
  floors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onAddFloor: (name: string) => void;
  onAddCategory: (name: string) => void;
  onClose: () => void;
  onSave: (payload: Omit<Room, 'id' | 'status'>) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 2));
  const [floorId, setFloorId] = useState(room?.floorId ?? floors[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(room?.categoryId ?? categories[0]?.id ?? '');
  const [price, setPrice] = useState(String(room?.pricePerNight ?? ''));
  const [newFloor, setNewFloor] = useState('');
  const [newCat, setNewCat] = useState('');
  const [showFloorInput, setShowFloorInput] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  const save = () => {
    if (!name.trim() || !price || !floorId || !categoryId) return toast.error(t('login.required'));
    onSave({
      name: name.trim(),
      capacity: Number(capacity),
      floorId,
      categoryId,
      pricePerNight: Number(price),
      maintenanceNote: room?.maintenanceNote,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={room ? `${t('common.edit')} · ${room.name}` : t('rooms.new')}
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton onClick={save}>{t('common.save')}</GradientButton>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label={t('rooms.roomName')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextField label={t('rooms.places')} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />

        <div>
          <SelectField label={t('rooms.floor')} required value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </SelectField>
          {!showFloorInput ? (
            <button type="button" onClick={() => setShowFloorInput(true)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <Plus size={13} /> {t('rooms.newFloor')}
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={newFloor} onChange={(e) => setNewFloor(e.target.value)} placeholder={t('rooms.newFloor')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
              <button type="button" onClick={() => { if (newFloor.trim()) { onAddFloor(newFloor.trim()); setNewFloor(''); setShowFloorInput(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
              <button type="button" onClick={() => { setShowFloorInput(false); setNewFloor(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary"><X size={16} /></button>
            </div>
          )}
        </div>

        <div>
          <SelectField label={t('common.category')} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectField>
          {!showCatInput ? (
            <button type="button" onClick={() => setShowCatInput(true)} className="mt-1.5 text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              <Plus size={13} /> {t('rooms.newCategory')}
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder={t('rooms.newCategory')} className="flex-1 h-9 rounded-lg bg-slate-100/70 border border-slate-200 px-3 text-sm text-ink-primary outline-none focus:border-brand-400/60" />
              <button type="button" onClick={() => { if (newCat.trim()) { onAddCategory(newCat.trim()); setNewCat(''); setShowCatInput(false); } }} className="grid h-9 w-9 place-items-center rounded-lg bg-grad-primary text-white"><Check size={16} /></button>
              <button type="button" onClick={() => { setShowCatInput(false); setNewCat(''); }} className="grid h-9 w-9 place-items-center rounded-lg glass text-ink-secondary"><X size={16} /></button>
            </div>
          )}
        </div>

        <TextField wrapClassName="sm:col-span-2" label={`${t('rooms.pricePerNight')} (DA)`} required type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
    </Modal>
  );
}

function ManageListModal({
  open, onClose, title, items, onAdd, onDelete, placeholder,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: { id: string; name: string }[];
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
            className="flex-1 h-11 rounded-xl bg-slate-100/70 border border-slate-200 px-3.5 text-sm text-ink-primary outline-none focus:border-brand-400/60"
            onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) { onAdd(value.trim()); setValue(''); } }} />
          <GradientButton icon={<Plus size={17} />} onClick={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}>
            {t('common.add')}
          </GradientButton>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
              <span className="text-sm text-ink-primary">{it.name}</span>
              <button onClick={() => onDelete(it.id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-ink-muted text-center py-4">{t('common.noData')}</p>}
        </div>
      </div>
    </Modal>
  );
}

function MaintenanceModal({
  room, onClose, onConfirm,
}: {
  room: Room | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  return (
    <Modal
      open={!!room}
      onClose={onClose}
      title={t('rooms.setMaintenance')}
      subtitle={room ? `${t('nav.chambres')} ${room.name}` : ''}
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <GradientButton variant="glass" onClick={onClose}>{t('common.cancel')}</GradientButton>
          <GradientButton variant="danger" icon={<Wrench size={16} />} onClick={() => { onConfirm(note); setNote(''); }}>
            {t('common.confirm')}
          </GradientButton>
        </div>
      }
    >
      <TextArea label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Réparation plomberie…" />
    </Modal>
  );
}

function RoomDetailsModal({
  room, onClose, data, lang,
}: {
  room: Room | null;
  onClose: () => void;
  data: ReturnType<typeof useAppData>;
  lang: 'fr' | 'ar';
}) {
  const { t } = useI18n();
  const [from, setFrom] = useState(addDaysISO(todayISO(), -60));
  const [to, setTo] = useState(todayISO());

  const reservations = useMemo(() => {
    if (!room) return [];
    return data.reservations.filter(
      (r) => r.status !== 'cancelled' && r.rooms.some((rr) => rr.roomId === room.id) && r.checkIn >= from && r.checkIn <= to,
    );
  }, [room, data.reservations, from, to]);

  const maintenances = useMemo(() => {
    if (!room) return [];
    return data.maintenances.filter((m) => m.roomId === room.id && m.date >= from && m.date <= to);
  }, [room, data.maintenances, from, to]);

  const gains = useMemo(
    () => reservations.reduce((s, r) => {
      const rr = r.rooms.find((x) => x.roomId === room?.id);
      return s + (rr ? rr.pricePerNight * nightsBetween(r.checkIn, r.checkOut) : 0);
    }, 0),
    [reservations, room],
  );
  const expenses = maintenances.reduce((s, m) => s + m.cost, 0);

  return (
    <Modal open={!!room} onClose={onClose} title={room ? `${t('nav.chambres')} ${room.name}` : ''} subtitle={room ? categoryName(data, room.categoryId) : ''} size="lg">
      {room && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-end">
            <TextField label={t('common.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
            <TextField label={t('common.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} wrapClassName="flex-1 min-w-[140px]" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('rooms.gains')} value={formatDA(gains)} tone="success" />
            <Stat label={t('expenses.tabMaintenance')} value={formatDA(expenses)} tone="danger" />
            <Stat label={t('rooms.netBalance')} value={formatDA(gains - expenses)} tone={gains - expenses >= 0 ? 'success' : 'danger'} />
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2">{t('rooms.reservationsPeriod')}</h4>
            <div className="space-y-2">
              {reservations.length === 0 ? <p className="text-sm text-ink-muted text-center py-3">{t('common.noData')}</p> :
                reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{r.code} · {clientName(data, r.clientId)}</p>
                      <p className="text-xs text-ink-muted">{formatDate(r.checkIn, lang)} → {formatDate(r.checkOut, lang)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{formatDA(reservationPaid(r))}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink-primary mb-2">{t('rooms.maintenancesPeriod')}</h4>
            <div className="space-y-2">
              {maintenances.length === 0 ? <p className="text-sm text-ink-muted text-center py-3">{t('common.noData')}</p> :
                maintenances.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl bg-slate-100/70 border border-slate-200 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{m.name}</p>
                      <p className="text-xs text-ink-muted">{formatDate(m.date, lang)}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">−{formatDA(m.cost)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
