import type { AppData } from '@/data/seed';
import type { Reservation, StoreInfo } from '@/types';
import { reservationPaid, reservationRemaining } from '@/store/selectors';
import { formatDA, formatDate, nightsBetween } from './utils';
import { clientById, roomName, categoryName, serviceName } from './lookups';

export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 32px; background: #fff; font-size: 13px; }
  .doc { max-width: 800px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #6366F1; padding-bottom: 16px; margin-bottom: 20px; }
  .brand { display:flex; gap:12px; align-items:center; }
  .logo { width: 54px; height: 54px; border-radius: 12px; background: linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; display:grid; place-items:center; font-size: 26px; font-weight: 800; }
  .brand h1 { font-size: 20px; color: #4338CA; }
  .brand p { font-size: 11px; color: #64748b; }
  .legal { text-align: right; font-size: 11px; color: #475569; line-height: 1.6; }
  .title { background: linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; padding: 10px 16px; border-radius: 10px; display:flex; justify-content: space-between; align-items:center; margin-bottom: 20px; }
  .title h2 { font-size: 16px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
  .box h3 { font-size: 11px; text-transform: uppercase; color: #6366F1; margin-bottom: 8px; letter-spacing: .5px; }
  .box p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 9px 12px; font-size: 11px; text-transform: uppercase; color: #475569; }
  td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
  .right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display:flex; justify-content: space-between; padding: 6px 0; }
  .totals .grand { border-top: 2px solid #6366F1; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #4338CA; }
  .stamp { margin-top: 28px; display:flex; justify-content: space-between; align-items: flex-end; }
  .cachet { border: 2px dashed #6366F1; color: #6366F1; border-radius: 12px; padding: 14px 22px; transform: rotate(-6deg); text-align:center; font-weight: 700; opacity: .8; }
  .cachet small { display:block; font-weight: 400; font-size: 10px; }
  .foot { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  .badge-paid { color: #059669; } .badge-debt { color: #dc2626; }
  @media print { body { padding: 0; } }
`;

export function printHTML(title: string, bodyHtml: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`,
  );
  doc.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 500);
  }, 350);
}

export function buildInvoiceHTML(data: AppData, r: Reservation, store: StoreInfo): string {
  const client = clientById(data, r.clientId);
  const nights = nightsBetween(r.checkIn, r.checkOut);
  const paid = reservationPaid(r);
  const remaining = reservationRemaining(r);

  const roomsRows = r.rooms
    .map(
      (rr) => `<tr>
      <td>Chambre ${roomName(data, rr.roomId)} <span style="color:#94a3b8">(${categoryName(data, rr.roomId ? data.rooms.find((x) => x.id === rr.roomId)?.categoryId ?? '' : '')})</span></td>
      <td class="right">${formatDA(rr.pricePerNight)}</td>
      <td class="right">${nights}</td>
      <td class="right">${formatDA(rr.pricePerNight * nights)}</td>
    </tr>`,
    )
    .join('');

  const servicesRows = r.services
    .map(
      (sv) => `<tr>
      <td>${serviceName(data, sv.serviceId)}</td>
      <td class="right">${formatDA(sv.unitPrice)}</td>
      <td class="right">${sv.quantity}</td>
      <td class="right">${formatDA(sv.unitPrice * sv.quantity)}</td>
    </tr>`,
    )
    .join('');

  return `
  <div class="doc">
    <div class="head">
      <div class="brand">
        <div class="logo">${store.name.charAt(0)}</div>
        <div>
          <h1>${store.name}</h1>
          <p>${store.description}</p>
          <p>${store.address}</p>
          <p>${store.phone} · ${store.email}</p>
        </div>
      </div>
      <div class="legal">
        <div><strong>NIF:</strong> ${store.nif}</div>
        <div><strong>NIS:</strong> ${store.nis}</div>
        <div><strong>Art:</strong> ${store.article}</div>
        <div><strong>RC:</strong> ${store.rc}</div>
      </div>
    </div>

    <div class="title">
      <h2>Bon de Réservation N° ${r.code}</h2>
      <span>${formatDate(r.createdAt)}</span>
    </div>

    <div class="grid2">
      <div class="box">
        <h3>Client</h3>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        <p>${client?.phone ?? ''}</p>
        <p>Pièce: ${client?.documentNumber ?? '—'}</p>
        <p>${client?.address ?? ''}</p>
      </div>
      <div class="box">
        <h3>Séjour</h3>
        <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée:</strong> ${nights} nuit(s)</p>
      </div>
    </div>

    <table>
      <thead><tr><th>Désignation</th><th class="right">P.U.</th><th class="right">Nuits/Qté</th><th class="right">Montant</th></tr></thead>
      <tbody>${roomsRows}${servicesRows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Total</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Payé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>Reste</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>Net à payer</span><span>${formatDA(r.total)}</span></div>
    </div>

    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>Le client reconnaît avoir pris connaissance des conditions de séjour.</p>
        <p style="margin-top:24px">Signature client: __________________</p>
      </div>
      <div class="cachet">${store.name}<small>Cachet & Signature</small></div>
    </div>

    <div class="foot">Document généré par ${store.name} — ${store.phone} — Merci de votre confiance.</div>
  </div>`;
}
