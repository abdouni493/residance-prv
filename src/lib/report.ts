import type { AppData } from '@/data/seed';
import type { Reservation, Maintenance, StoreInfo } from '@/types';
import {
  reservationIncomeInRange, reservationPaid, reservationRemaining, caisseRecap,
  occupancyByFloor, nightsSoldByRoom, type CaisseRecap,
} from '@/store/selectors';
import { nightsBetween } from './utils';
import { formatDA, formatDate, todayISO } from './utils';
import { clientName, roomName, serviceName, expenseCategoryName } from './lookups';

export interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  netGain: number;
  avgOccupancy: number;
  reservations: {
    total: number;
    paid: number;
    debt: number;
    cancelled: number;
    list: Reservation[];
    nightsSold: { name: string; nights: number }[];
    topClient: { name: string; total: number } | null;
  };
  clients: {
    newCount: number;
    top: { name: string; total: number }[];
    debts: { name: string; amount: number }[];
    totalDebt: number;
  };
  rooms: {
    occupancy: { name: string; rate: number }[];
    mostProfitable: { name: string; revenue: number } | null;
    maintenances: Maintenance[];
    maintTotal: number;
  };
  services: { sold: { name: string; qty: number; revenue: number }[] };
  expensesDetail: { byCategory: { name: string; total: number }[]; total: number };
  staff: { payments: { name: string; total: number }[]; advances: number; absences: number };
  caisse: CaisseRecap;
}

function inRange(iso: string, from: string, to: string) {
  return iso >= from && iso <= to;
}

export function buildReportData(data: AppData, from: string, to: string): ReportData {
  const periodRes = data.reservations.filter((r) => inRange(r.checkIn, from, to));
  const validRes = periodRes.filter((r) => r.status !== 'cancelled');

  const totalRevenue = reservationIncomeInRange(data.reservations, from, to);
  const recap = caisseRecap(data, from, to);
  const totalExpenses = recap.generalExpenses + recap.maintenances + recap.salaries + recap.advances;

  // reservations breakdown
  const paid = periodRes.filter((r) => r.status === 'paid' || r.status === 'active').length;
  const debt = periodRes.filter((r) => r.status === 'debt').length;
  const cancelled = periodRes.filter((r) => r.status === 'cancelled').length;

  // top client by total in period
  const clientTotals = new Map<string, number>();
  for (const r of validRes) clientTotals.set(r.clientId, (clientTotals.get(r.clientId) ?? 0) + r.total);
  const sortedClients = [...clientTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topClient = sortedClients[0]
    ? { name: clientName(data, sortedClients[0][0]), total: sortedClients[0][1] }
    : null;
  const top = sortedClients.slice(0, 5).map(([id, total]) => ({ name: clientName(data, id), total }));

  // client debts (all-time outstanding)
  const debtMap = new Map<string, number>();
  for (const r of data.reservations) {
    const rem = reservationRemaining(r);
    if (rem > 0) debtMap.set(r.clientId, (debtMap.get(r.clientId) ?? 0) + rem);
  }
  const debts = [...debtMap.entries()].sort((a, b) => b[1] - a[1]).map(([id, amount]) => ({ name: clientName(data, id), amount }));
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);

  const newCount = data.clients.filter((c) => inRange(c.createdAt, from, to)).length;

  // rooms: most profitable (revenue = price*nights over period)
  const roomRevenue = new Map<string, number>();
  for (const r of validRes) {
    const nights = nightsBetween(r.checkIn, r.checkOut);
    for (const rr of r.rooms) roomRevenue.set(rr.roomId, (roomRevenue.get(rr.roomId) ?? 0) + rr.pricePerNight * nights);
  }
  const sortedRooms = [...roomRevenue.entries()].sort((a, b) => b[1] - a[1]);
  const mostProfitable = sortedRooms[0] ? { name: roomName(data, sortedRooms[0][0]), revenue: sortedRooms[0][1] } : null;

  const maintenances = data.maintenances.filter((m) => inRange(m.date, from, to));
  const maintTotal = maintenances.reduce((s, m) => s + m.cost, 0);

  // services sold
  const svcMap = new Map<string, { qty: number; revenue: number }>();
  for (const r of validRes) {
    for (const sv of r.services) {
      const cur = svcMap.get(sv.serviceId) ?? { qty: 0, revenue: 0 };
      cur.qty += sv.quantity;
      cur.revenue += sv.unitPrice * sv.quantity;
      svcMap.set(sv.serviceId, cur);
    }
  }
  const sold = [...svcMap.entries()].map(([id, v]) => ({ name: serviceName(data, id), qty: v.qty, revenue: v.revenue }));

  // expenses by category
  const catMap = new Map<string, number>();
  let expTotal = 0;
  for (const e of data.expenses) {
    if (!inRange(e.date, from, to)) continue;
    expTotal += e.amount;
    const name = expenseCategoryName(data, e.categoryId);
    catMap.set(name, (catMap.get(name) ?? 0) + e.amount);
  }
  const byCategory = [...catMap.entries()].map(([name, total]) => ({ name, total }));

  // staff payments in range
  const payMap: { name: string; total: number }[] = [];
  let advances = 0;
  let absences = 0;
  for (const w of data.workers) {
    const total = w.payments.filter((p) => inRange(p.date, from, to)).reduce((s, p) => s + p.amount, 0);
    if (total > 0) payMap.push({ name: w.name, total });
    advances += w.advances.filter((a) => inRange(a.date, from, to)).reduce((s, a) => s + a.amount, 0);
    absences += w.absences.filter((a) => inRange(a.date, from, to)).length;
  }

  const occ = occupancyByFloor(data, todayISO());
  const avgOccupancy = occ.length ? Math.round(occ.reduce((s, o) => s + o.rate, 0) / occ.length) : 0;

  return {
    totalRevenue,
    totalExpenses,
    netGain: totalRevenue - totalExpenses,
    avgOccupancy,
    reservations: {
      total: periodRes.length, paid, debt, cancelled, list: validRes,
      nightsSold: nightsSoldByRoom(data, from, to), topClient,
    },
    clients: { newCount, top, debts, totalDebt },
    rooms: { occupancy: occ, mostProfitable, maintenances, maintTotal },
    services: { sold },
    expensesDetail: { byCategory, total: expTotal },
    staff: { payments: payMap, advances, absences },
    caisse: recap,
  };
}

export function buildReportHTML(data: AppData, rep: ReportData, store: StoreInfo, from: string, to: string): string {
  const row = (a: string, b: string) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;
  const resRows = rep.reservations.list
    .slice(0, 40)
    .map(
      (r) => `<tr><td>${r.code}</td><td>${clientName(data, r.clientId)}</td><td>${formatDate(r.checkIn)}</td><td class="right">${r.nights}</td><td class="right">${formatDA(r.total)}</td><td class="right">${formatDA(reservationPaid(r))}</td></tr>`,
    )
    .join('');

  return `
  <div class="doc">
    <div class="head">
      <div class="brand"><div class="logo">${store.name.charAt(0)}</div>
        <div><h1>${store.name}</h1><p>Rapport d'activité</p><p>${formatDate(from)} → ${formatDate(to)}</p></div></div>
      <div class="legal"><div><strong>NIF:</strong> ${store.nif}</div><div><strong>RC:</strong> ${store.rc}</div></div>
    </div>

    <div class="title"><h2>1. Résumé exécutif</h2></div>
    <div class="totals" style="width:100%">
      ${row('Recettes totales', formatDA(rep.totalRevenue))}
      ${row('Dépenses totales', formatDA(rep.totalExpenses))}
      ${row('Gain net', formatDA(rep.netGain))}
      ${row("Taux d'occupation moyen", rep.avgOccupancy + '%')}
    </div>

    <div class="title"><h2>2. Réservations (${rep.reservations.total})</h2></div>
    <p style="margin-bottom:8px">Payées: ${rep.reservations.paid} · Dettes: ${rep.reservations.debt} · Annulées: ${rep.reservations.cancelled}</p>
    <table><thead><tr><th>Code</th><th>Client</th><th>Arrivée</th><th class="right">Nuits</th><th class="right">Total</th><th class="right">Payé</th></tr></thead><tbody>${resRows}</tbody></table>

    <div class="title"><h2>3. Clients</h2></div>
    <p>Nouveaux clients: ${rep.clients.newCount} · Dettes en cours: ${formatDA(rep.clients.totalDebt)}</p>
    <table><thead><tr><th>Top clients</th><th class="right">Chiffre d'affaires</th></tr></thead><tbody>
      ${rep.clients.top.map((c) => `<tr><td>${c.name}</td><td class="right">${formatDA(c.total)}</td></tr>`).join('')}
    </tbody></table>

    <div class="title"><h2>4. Chambres</h2></div>
    <p>Chambre la plus rentable: ${rep.rooms.mostProfitable ? `${rep.rooms.mostProfitable.name} (${formatDA(rep.rooms.mostProfitable.revenue)})` : '—'} · Maintenances: ${formatDA(rep.rooms.maintTotal)}</p>

    <div class="title"><h2>5. Services</h2></div>
    <table><thead><tr><th>Service</th><th class="right">Quantité</th><th class="right">CA</th></tr></thead><tbody>
      ${rep.services.sold.map((s) => `<tr><td>${s.name}</td><td class="right">${s.qty}</td><td class="right">${formatDA(s.revenue)}</td></tr>`).join('') || '<tr><td colspan="3">—</td></tr>'}
    </tbody></table>

    <div class="title"><h2>6. Dépenses (${formatDA(rep.expensesDetail.total)})</h2></div>
    <table><thead><tr><th>Catégorie</th><th class="right">Montant</th></tr></thead><tbody>
      ${rep.expensesDetail.byCategory.map((c) => `<tr><td>${c.name}</td><td class="right">${formatDA(c.total)}</td></tr>`).join('')}
    </tbody></table>

    <div class="title"><h2>7. Personnel</h2></div>
    <table><thead><tr><th>Travailleur</th><th class="right">Payé</th></tr></thead><tbody>
      ${rep.staff.payments.map((p) => `<tr><td>${p.name}</td><td class="right">${formatDA(p.total)}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>'}
    </tbody></table>
    <p>Acomptes accordés: ${formatDA(rep.staff.advances)} · Absences: ${rep.staff.absences}</p>

    <div class="title"><h2>8. Caisse</h2></div>
    <div class="totals" style="width:100%">
      ${row('Total entrées', formatDA(rep.caisse.totalIn))}
      ${row('Total sorties', formatDA(rep.caisse.totalOut))}
      ${row('Solde net période', formatDA(rep.caisse.net))}
    </div>

    <div class="foot">Rapport généré par ${store.name} — ${new Date().toLocaleString('fr-FR')}</div>
  </div>`;
}
