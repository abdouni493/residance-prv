import type { AppData } from '@/data/seed';
import type { Reservation, StoreInfo } from '@/types';
import { reservationPaid, reservationRemaining } from '@/store/selectors';
import { formatDA, formatDate, nightsBetween } from './utils';
import { clientById, serviceName } from './lookups';

export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 28px; background: #fff; font-size: 12.5px; }
  .doc { max-width: 820px; margin: 0 auto; }

  /* ── Header ── */
  .head { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 18px; border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 18px; }
  .logo-wrap { width: 80px; }
  .logo-wrap img { width: 80px; height: auto; object-fit: contain; border-radius: 8px; }
  .logo-placeholder { width: 80px; height: 60px; background: linear-gradient(135deg,#0ea5e9,#0284c7); border-radius: 10px; display:grid; place-items:center; font-size: 28px; font-weight: 800; color:#fff; }
  .brand-info h1 { font-size: 18px; color: #0369a1; font-weight: 800; }
  .brand-info p { font-size: 11px; color: #64748b; margin-top: 2px; }
  .brand-info .description { font-size: 11px; color: #475569; font-style: italic; margin-top: 3px; }
  .res-meta { text-align: right; }
  .res-meta .code { font-size: 20px; font-weight: 900; color: #0369a1; }
  .res-meta .date { font-size: 11px; color: #64748b; margin-top: 2px; }
  .legal { display: flex; gap: 24px; font-size: 10.5px; color: #475569; margin-top: 4px; }
  .legal span { white-space: nowrap; }

  /* ── Section boxes ── */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; }
  .section { border: 2px solid; border-radius: 10px; padding: 12px 14px; }
  .section.blue { border-color: #bae6fd; }
  .section.green { border-color: #bbf7d0; }
  .section.violet { border-color: #ddd6fe; }
  .section.orange { border-color: #fed7aa; }
  .section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: .6px; margin-bottom: 7px; font-weight: 700; }
  .section.blue h3 { color: #0284c7; }
  .section.green h3 { color: #059669; }
  .section.violet h3 { color: #7c3aed; }
  .section.orange h3 { color: #d97706; }
  .section p { margin: 2px 0; line-height: 1.5; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
  th { background: #f0f9ff; text-align: left; padding: 8px 10px; font-size: 10.5px; text-transform: uppercase; color: #0369a1; letter-spacing: .4px; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .right { text-align: right; }
  .tbl-head { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin: 12px 0 6px; color: #475569; }

  /* ── Totals ── */
  .totals-wrap { margin-left: auto; width: 300px; border: 2px solid #bae6fd; border-radius: 10px; padding: 12px 16px; }
  .totals-wrap .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-wrap .grand { border-top: 2px solid #0284c7; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 800; color: #0369a1; }
  .badge-paid { color: #059669; font-weight: 700; }
  .badge-debt { color: #dc2626; font-weight: 700; }

  /* ── Stamp ── */
  .stamp { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .cachet { border: 2px dashed #0284c7; color: #0369a1; border-radius: 12px; padding: 12px 20px; transform: rotate(-5deg); text-align: center; font-weight: 700; font-size: 12px; }
  .cachet small { display: block; font-weight: 400; font-size: 10px; margin-top: 4px; }
  .foot { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
`;

export function printHTML(title: string, bodyHtml: string, extraStyles = '') {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}${extraStyles}</style></head><body>${bodyHtml}</body></html>`);
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

  const logoHtml = store.logo
    ? `<img src="${store.logo}" alt="logo" />`
    : `<div class="logo-placeholder">${store.name.charAt(0)}</div>`;

  const roomRows = r.rooms.map((rr) => {
    const room = data.rooms.find((x) => x.id === rr.roomId);
    const floor = room ? (data.floors.find((f) => f.id === room.floorId)?.name ?? '—') : '—';
    const cat = room ? (data.categories.find((c) => c.id === room.categoryId)?.name ?? '—') : '—';
    return `<tr>
      <td>${room?.name ?? '—'}</td>
      <td>${floor}</td>
      <td>${cat}</td>
      <td class="right">${formatDA(rr.pricePerNight)}</td>
      <td class="right">${nights}</td>
      <td class="right">${formatDA(rr.pricePerNight * nights)}</td>
    </tr>`;
  }).join('');

  const serviceSection = r.services.length > 0 ? `
    <p class="tbl-head">✨ Services additionnels</p>
    <table>
      <thead><tr><th>Service</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Total</th></tr></thead>
      <tbody>${r.services.map((sv) => `<tr>
        <td>${serviceName(data, sv.serviceId)}</td>
        <td class="right">${sv.quantity}</td>
        <td class="right">${formatDA(sv.unitPrice)}</td>
        <td class="right">${formatDA(sv.unitPrice * sv.quantity)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  const paymentSection = r.payments.length > 0 ? `
    <p class="tbl-head">💳 Paiements</p>
    <table>
      <thead><tr><th>Date</th><th>Note</th><th class="right">Montant</th></tr></thead>
      <tbody>${r.payments.map((p) => `<tr>
        <td>${formatDate(p.date)}</td>
        <td>${p.note ?? '—'}</td>
        <td class="right badge-paid">${formatDA(p.amount)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '';

  const legalItems = [
    store.nif && `<span><strong>NIF:</strong> ${store.nif}</span>`,
    store.nis && `<span><strong>NIS:</strong> ${store.nis}</span>`,
    store.rc && `<span><strong>RC:</strong> ${store.rc}</span>`,
    store.article && `<span><strong>Art:</strong> ${store.article}</span>`,
  ].filter(Boolean).join('');

  return `
  <div class="doc">
    <!-- Header -->
    <div class="head">
      <div class="logo-wrap">${logoHtml}</div>
      <div class="brand-info">
        <h1>${store.name}</h1>
        ${store.description ? `<p class="description">${store.description}</p>` : ''}
        <p>${store.address}</p>
        <p>${store.phone}${store.email ? ` · ${store.email}` : ''}</p>
        <div class="legal">${legalItems}</div>
      </div>
      <div class="res-meta">
        <div class="code">N° ${r.code}</div>
        <div class="date">Créé le ${formatDate(r.createdAt)}</div>
      </div>
    </div>

    <!-- Client + Dates -->
    <div class="grid2">
      <div class="section blue">
        <h3>👤 Client</h3>
        <p><strong>${client ? `${client.firstName} ${client.lastName}` : '—'}</strong></p>
        ${client?.sexe ? `<p>${client.sexe === 'M' ? 'Masculin' : 'Féminin'}${client.profession ? ` · ${client.profession}` : ''}</p>` : ''}
        <p>${client?.phone ?? ''}${client?.phone2 ? ` / ${client.phone2}` : ''}</p>
        ${client?.email ? `<p>${client.email}</p>` : ''}
        ${client?.city ? `<p>${client.city}${client.address ? `, ${client.address}` : ''}</p>` : ''}
        ${client?.documentType ? `<p>Pièce: ${client.documentNumber ?? '—'} (${client.documentType})</p>` : ''}
      </div>
      <div class="section green">
        <h3>📅 Réservation</h3>
        <p><strong>Arrivée:</strong> ${formatDate(r.checkIn)} à ${r.checkInTime}</p>
        <p><strong>Départ:</strong> ${formatDate(r.checkOut)} à ${r.checkOutTime}</p>
        <p><strong>Durée:</strong> ${nights} nuit(s)</p>
      </div>
    </div>

    <!-- Apartments -->
    <p class="tbl-head">🏠 Appartement(s)</p>
    <table>
      <thead><tr><th>Nom</th><th>Étage</th><th>Catégorie</th><th class="right">Prix/nuit</th><th class="right">Nuits</th><th class="right">Sous-total</th></tr></thead>
      <tbody>${roomRows}</tbody>
    </table>

    ${serviceSection}
    ${paymentSection}

    <!-- Totals -->
    <div class="totals-wrap">
      <div class="row"><span>Total réservation</span><strong>${formatDA(r.total)}</strong></div>
      <div class="row"><span>Total payé</span><span class="badge-paid">${formatDA(paid)}</span></div>
      <div class="row"><span>Reste dû</span><span class="${remaining > 0 ? 'badge-debt' : 'badge-paid'}">${formatDA(remaining)}</span></div>
      <div class="row grand"><span>Net à payer</span><span>${formatDA(r.total)}</span></div>
    </div>

    <!-- Stamp -->
    <div class="stamp">
      <div style="font-size:11px;color:#64748b">
        <p>Le client reconnaît avoir pris connaissance des conditions de séjour.</p>
        <p style="margin-top:28px">Signature client : ____________________</p>
      </div>
      <div class="cachet">${store.name}<small>Cachet &amp; Signature</small></div>
    </div>

    <div class="foot">Document généré par ${store.name}${store.phone ? ` — ${store.phone}` : ''} — Merci de votre confiance.</div>
  </div>`;
}
