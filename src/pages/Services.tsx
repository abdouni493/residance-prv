import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Pencil, Trash2 } from 'lucide-react';
import { useApp, useCurrentPermissions, can } from '@/store/appStore';
import { useI18n } from '@/i18n';
import { useToast } from '@/components/ui/Toast';
import { PageHeader, EmptyState } from '@/components/ui/Misc';
import { GradientButton } from '@/components/ui/GradientButton';
import { GradientCard } from '@/components/ui/GradientCard';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField, TextArea } from '@/components/ui/Field';
import { staggerContainer, listItem } from '@/animations';
import { formatDA } from '@/lib/utils';
import type { Service } from '@/types';

export default function Services() {
  const { t } = useI18n();
  const toast = useToast();
  const services = useApp((s) => s.services);
  const addService = useApp((s) => s.addService);
  const updateService = useApp((s) => s.updateService);
  const deleteService = useApp((s) => s.deleteService);
  const perms = useCurrentPermissions();

  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Service | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('');
    setFormOpen(true);
  };
  const openEdit = (svc: Service) => {
    setEditing(svc);
    setName(svc.name);
    setDescription(svc.description ?? '');
    setPrice(String(svc.price));
    setFormOpen(true);
  };

  const save = () => {
    if (!name.trim() || !price) return toast.error(t('login.required'));
    const payload = { name: name.trim(), description: description.trim(), price: Number(price) };
    if (editing) {
      updateService(editing.id, payload);
      toast.success(t('toast.updated'));
    } else {
      addService(payload);
      toast.success(t('toast.created'));
    }
    setFormOpen(false);
  };

  return (
    <div>
      <PageHeader
        icon={<Sparkles size={24} />}
        title={t('services.title')}
        subtitle={t('services.subtitle')}
        actions={
          can(perms, 'services', 'create') && (
            <GradientButton icon={<Plus size={18} />} onClick={openCreate}>
              {t('services.new')}
            </GradientButton>
          )
        }
      />

      {services.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={36} />}
          title={t('common.emptyTitle')}
          hint={t('common.emptyHint')}
          action={
            can(perms, 'services', 'create') && (
              <GradientButton icon={<Plus size={18} />} onClick={openCreate}>
                {t('services.new')}
              </GradientButton>
            )
          }
        />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {services.map((svc) => (
              <motion.div key={svc.id} variants={listItem} layout exit="exit">
                <GradientCard className="p-5 h-full flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-grad-gold text-white shadow-lg shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-ink-primary truncate">{svc.name}</h3>
                      <p className="text-sm text-ink-secondary mt-0.5 line-clamp-2">
                        {svc.description || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-gradient">{formatDA(svc.price)}</span>
                    <div className="flex items-center gap-1.5">
                      {can(perms, 'services', 'edit') && (
                        <button
                          onClick={() => openEdit(svc)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-brand-600 hover:bg-slate-100 transition-colors"
                          aria-label={t('common.edit')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {can(perms, 'services', 'delete') && (
                        <button
                          onClick={() => setToDelete(svc)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-ink-secondary hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </GradientCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('common.edit') : t('services.new')}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <GradientButton variant="glass" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </GradientButton>
            <GradientButton onClick={save}>{t('common.save')}</GradientButton>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField label={t('common.name')} required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextArea label={t('common.description')} value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextField
            label={`${t('common.price')} (DA)`}
            required
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            deleteService(toDelete.id);
            toast.success(t('toast.deleted'));
          }
        }}
        message={toDelete ? `${t('common.deleteMsg')} (${toDelete.name})` : ''}
      />
    </div>
  );
}
