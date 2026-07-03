import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n';
import type { ReservationStatus } from '@/types';

export function ResStatusBadge({ status }: { status: ReservationStatus }) {
  const { t } = useI18n();
  switch (status) {
    case 'paid':
      return <Badge tone="success" dot>{t('res.statusPaid')}</Badge>;
    case 'debt':
      return <Badge tone="danger" dot>{t('res.statusDebt')}</Badge>;
    case 'active':
      return <Badge tone="active" dot>{t('res.statusActive')}</Badge>;
    case 'cancelled':
      return <Badge tone="neutral" dot>{t('res.statusCancelled')}</Badge>;
  }
}
