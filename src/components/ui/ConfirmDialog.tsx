import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { GradientButton } from './GradientButton';
import { useI18n } from '@/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: ReactNode;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger = true,
}: Props) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="text-center py-2">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-grad-warning shadow-glow">
          <AlertTriangle className="text-white" size={28} />
        </div>
        <h3 className="text-lg font-bold text-ink-primary">{title ?? t('common.deleteConfirm')}</h3>
        <p className="mt-1.5 text-sm text-ink-secondary">{message ?? t('common.deleteMsg')}</p>
        <div className="mt-6 flex gap-3">
          <GradientButton variant="glass" fullWidth onClick={onClose}>
            {t('common.cancel')}
          </GradientButton>
          <GradientButton
            variant={danger ? 'danger' : 'primary'}
            fullWidth
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t('common.delete')}
          </GradientButton>
        </div>
      </div>
    </Modal>
  );
}
