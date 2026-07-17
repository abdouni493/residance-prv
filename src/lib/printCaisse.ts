import type { StoreInfo } from '@/types';
import type { ExpenseCaisseEntry, ExpenseCaisseEntryKind, ExpensesCaisseRecap } from '@/store/selectors';
import { formatDA, formatDate, todayISO } from './utils';

/**
 * Printable journal of the expenses cash box: the movements of whatever period
 * and kind filter is selected on the page, laid out as a signed-off ledger.
 */

/** Styles specific to the cash-box journal, appended after PRINT_STYLES. */
export const CAISSE_PRINT_STYLES = `
  .ec-title { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 14px; }
  .ec-title h2 { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: .2px; }
  .ec-title .period { font-size: 11px; color: #475569; margin-top: 3px; }
  .ec-title .filter { font-size: 10px; color: #0369a1; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 999px; padding: 3px 10px; font-weight: 700; white-space: nowrap; }

  .ec-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
  .ec-kpi { border: 1.5px solid #e2e8f0; border-top-width: 4px; border-radius: 10px; padding: 9px 11px; }
  .ec-kpi .k { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #64748b; font-weight: 700; }
  .ec-kpi .v { font-size: 15px; font-weight: 800; margin-top: 3px; color: #0f172a; }
  .ec-kpi .h { font-size: 9px; color: #94a3b8; margin-top: 1px; }
  .ec-kpi.sky { border-top-color: #0284c7; } .ec-kpi.sky .v { color: #0369a1; }
  .ec-kpi.green { border-top-color: #059669; } .ec-kpi.green .v { color: #059669; }
  .ec-kpi.red { border-top-color: #e11d48; } .ec-kpi.red .v { color: #be123c; }
  .ec-kpi.amber { border-top-color: #d97706; } .ec-kpi.amber .v { color: #b45309; }

  .ec-tbl { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
  .ec-tbl thead th { background: #0f172a; color: #fff; text-align: left; padding: 7px 9px; font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
  .ec-tbl thead th:first-child { border-radius: 6px 0 0 0; }
  .ec-tbl thead th:last-child { border-radius: 0 6px 0 0; }
  .ec-tbl tbody td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .ec-tbl tbody tr:nth-child(even) { background: #f8fafc; }
  .ec-tbl tfoot td { padding: 8px 9px; border-top: 2px solid #0f172a; font-weight: 800; font-size: 12px; }
  .ec-tbl .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ec-tbl .muted { color: #64748b; }
  .ec-tbl .nowrap { white-space: nowrap; }
  .ec-in { color: #059669; font-weight: 700; }
  .ec-out { color: #be123c; font-weight: 700; }

  .ec-tag { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 9px; font-weight: 700; border: 1px solid; white-space: nowrap; }
  .ec-tag.deposit { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
  .ec-tag.withdrawal { color: #be123c; background: #fff1f2; border-color: #fecdd3; }
  .ec-tag.expense { color: #b45309; background: #fffbeb; border-color: #fde68a; }
  .ec-tag.maintenance { color: #6d28d9; background: #f5f3ff; border-color: #ddd6fe; }

  .ec-sub { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #0f172a; margin: 0 0 7px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; }
  .ec-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .ec-recap { border: 2px solid #bae6fd; border-radius: 10px; overflow: hidden; }
  .ec-recap .hd { background: #f0f9ff; padding: 7px 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #0369a1; }
  .ec-recap .bd { padding: 10px 12px; }
  .ec-recap .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11.5px; }
  .ec-recap .sum { border-top: 1px solid #e2e8f0; margin-top: 4px; padding-top: 6px; font-weight: 700; }
  .ec-recap .net { border-top: 2px solid #0284c7; margin-top: 6px; padding-top: 7px; font-size: 13.5px; font-weight: 800; }

  .ec-empty { text-align: center; color: #94a3b8; font-size: 11px; padding: 18px 0; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 16px; }
  .ec-sign { margin-top: 22px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #64748b; }

  @media print {
    .ec-tbl { page-break-inside: auto; }
    .ec-tbl tr { page-break-inside: avoid; }
    .ec-tbl thead { display: table-header-group; }
    .ec-tbl thead th, .ec-tbl tbody tr:nth-child(even), .ec-kpi, .ec-tag, .ec-recap .hd {
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
  }
`;

const KIND_LABEL: Record<ExpenseCaisseEntryKind, string> = {
  deposit: 'Versement',
  withdrawal: 'Retrait',
  expense: 'Dépense',
  maintenance: 'Maintenance',
};

function esc(v: string | undefined | null): string {
  return String(v ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

export interface CaissePrintInput {
  entries: ExpenseCaisseEntry[];
  recap: ExpensesCaisseRecap;
  balance: number;
  store: StoreInfo;
  from: string;
  to: string;
  /** Label of the kind filter active on the page ("Tout", "Dépenses", …). */
  filterLabel: string;
}

export function buildExpensesCaisseHTML({
  entries, recap, balance, store, from, to, filterLabel,
}: CaissePrintInput): string {
  const logoHtml = store.logo
    ? `<img src="${store.logo}" alt="logo" />`
    : `<div class="logo-placeholder">${esc(store.name.charAt(0))}</div>`;

  const legalItems = [
    store.nif && `<span><strong>NIF:</strong> ${esc(store.nif)}</span>`,
    store.nis && `<span><strong>NIS:</strong> ${esc(store.nis)}</span>`,
    store.rc && `<span><strong>RC:</strong> ${esc(store.rc)}</span>`,
    store.article && `<span><strong>Art:</strong> ${esc(store.article)}</span>`,
  ].filter(Boolean).join('');

  // Oldest first reads like a ledger on paper, unlike the newest-first screen list.
  const ordered = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const totalIn = ordered.filter((e) => e.direction === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = ordered.filter((e) => e.direction === 'out').reduce((s, e) => s + e.amount, 0);

  const movementRows = ordered.map((e, i) => `
    <tr>
      <td class="muted num">${i + 1}</td>
      <td class="nowrap">${formatDate(e.date)}</td>
      <td><span class="ec-tag ${e.kind}">${KIND_LABEL[e.kind]}</span></td>
      <td><strong>${esc(e.title)}</strong></td>
      <td class="muted">${esc(e.subtitle) || '—'}</td>
      <td class="muted">${esc(e.description) || '—'}</td>
      <td class="num ${e.direction === 'in' ? 'ec-in' : ''}">${e.direction === 'in' ? formatDA(e.amount) : '—'}</td>
      <td class="num ${e.direction === 'out' ? 'ec-out' : ''}">${e.direction === 'out' ? formatDA(e.amount) : '—'}</td>
    </tr>`).join('');

  const movementsTable = ordered.length === 0
    ? '<div class="ec-empty">Aucun mouvement sur cette période.</div>'
    : `<table class="ec-tbl">
        <thead><tr>
          <th style="width:26px">#</th><th style="width:78px">Date</th><th style="width:82px">Type</th>
          <th>Libellé</th><th style="width:110px">Catégorie</th><th>Description</th>
          <th class="num" style="width:88px">Entrée</th><th class="num" style="width:88px">Sortie</th>
        </tr></thead>
        <tbody>${movementRows}</tbody>
        <tfoot><tr>
          <td colspan="6">Totaux — ${ordered.length} mouvement(s)</td>
          <td class="num ec-in">${formatDA(totalIn)}</td>
          <td class="num ec-out">${formatDA(totalOut)}</td>
        </tr></tfoot>
      </table>`;

  const expenses = ordered.filter((e) => e.kind === 'expense' || e.kind === 'maintenance');
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const expensesTable = expenses.length === 0 ? '' : `
    <p class="ec-sub">Détail des dépenses &amp; maintenances</p>
    <table class="ec-tbl">
      <thead><tr>
        <th style="width:26px">#</th><th style="width:78px">Date</th><th>Désignation</th>
        <th style="width:130px">Catégorie / Chambre</th><th>Description</th>
        <th class="num" style="width:96px">Montant</th>
      </tr></thead>
      <tbody>${expenses.map((e, i) => `
        <tr>
          <td class="muted num">${i + 1}</td>
          <td class="nowrap">${formatDate(e.date)}</td>
          <td><strong>${esc(e.title)}</strong></td>
          <td><span class="ec-tag ${e.kind}">${esc(e.subtitle) || KIND_LABEL[e.kind]}</span></td>
          <td class="muted">${esc(e.description) || '—'}</td>
          <td class="num ec-out">${formatDA(e.amount)}</td>
        </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td colspan="5">Total dépenses — ${expenses.length} ligne(s)</td>
        <td class="num ec-out">${formatDA(expensesTotal)}</td>
      </tr></tfoot>
    </table>`;

  const breakdown = (title: string, rows: { name: string; total: number }[], total: number) =>
    rows.length === 0 ? '' : `
    <div>
      <p class="ec-sub">${title}</p>
      <table class="ec-tbl">
        <thead><tr><th>Libellé</th><th class="num" style="width:88px">Montant</th><th class="num" style="width:44px">%</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <td>${esc(r.name)}</td>
          <td class="num ec-out">${formatDA(r.total)}</td>
          <td class="num muted">${total > 0 ? Math.round((r.total / total) * 100) : 0}%</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="num ec-out">${formatDA(total)}</td><td class="num">100%</td></tr></tfoot>
      </table>
    </div>`;

  const allExpenses = recap.generalExpenses + recap.maintenances;

  return `
  <div class="doc">
    <div class="head">
      <div class="logo-wrap">${logoHtml}</div>
      <div class="brand-info">
        <h1>${esc(store.name)}</h1>
        ${store.description ? `<p class="description">${esc(store.description)}</p>` : ''}
        <p>${esc(store.address)}</p>
        <p>${esc(store.phone)}${store.email ? ` · ${esc(store.email)}` : ''}</p>
        <div class="legal">${legalItems}</div>
      </div>
      <div class="res-meta">
        <div class="code">CAISSE DÉPENSES</div>
        <div class="date">Édité le ${formatDate(todayISO())}</div>
      </div>
    </div>

    <div class="ec-title">
      <div>
        <h2>Journal de la caisse dépenses</h2>
        <p class="period">Période du <strong>${formatDate(from)}</strong> au <strong>${formatDate(to)}</strong></p>
      </div>
      <span class="filter">Filtre : ${esc(filterLabel)}</span>
    </div>

    <div class="ec-kpis">
      <div class="ec-kpi sky"><div class="k">Solde de la caisse</div><div class="v">${formatDA(balance)}</div><div class="h">Tous mouvements confondus</div></div>
      <div class="ec-kpi green"><div class="k">Versements</div><div class="v">+${formatDA(recap.deposits)}</div><div class="h">Sur la période</div></div>
      <div class="ec-kpi red"><div class="k">Retraits</div><div class="v">−${formatDA(recap.withdrawals)}</div><div class="h">Sur la période</div></div>
      <div class="ec-kpi amber"><div class="k">Dépenses</div><div class="v">−${formatDA(allExpenses)}</div><div class="h">${recap.expenseCount} dépense(s) + maintenances</div></div>
    </div>

    <p class="ec-sub">Mouvements de la période</p>
    ${movementsTable}

    ${expensesTable}

    <div class="ec-cols">
      <div>
        <p class="ec-sub">Récapitulatif</p>
        <div class="ec-recap">
          <div class="hd">${formatDate(from)} → ${formatDate(to)}</div>
          <div class="bd">
            <div class="row"><span>Versements</span><span class="ec-in">+${formatDA(recap.deposits)}</span></div>
            <div class="row sum"><span>Total entrées</span><span class="ec-in">+${formatDA(recap.deposits)}</span></div>
            <div class="row" style="margin-top:6px"><span>Retraits</span><span class="ec-out">−${formatDA(recap.withdrawals)}</span></div>
            <div class="row"><span>Dépenses générales</span><span class="ec-out">−${formatDA(recap.generalExpenses)}</span></div>
            <div class="row"><span>Maintenances</span><span class="ec-out">−${formatDA(recap.maintenances)}</span></div>
            <div class="row sum"><span>Total sorties</span><span class="ec-out">−${formatDA(recap.totalOut)}</span></div>
            <div class="row net"><span>Flux net de la période</span><span class="${recap.net >= 0 ? 'ec-in' : 'ec-out'}">${formatDA(recap.net)}</span></div>
            <div class="row"><span>Solde de la caisse</span><span class="${balance >= 0 ? 'ec-in' : 'ec-out'}">${formatDA(balance)}</span></div>
          </div>
        </div>
      </div>
      ${breakdown('Dépenses par catégorie', recap.expensesByCategory, recap.generalExpenses)}
    </div>

    ${recap.maintenancesByRoom.length > 0
      ? `<div style="margin-top:16px">${breakdown('Maintenances par chambre', recap.maintenancesByRoom, recap.maintenances)}</div>`
      : ''}

    <div class="ec-sign">
      <div>
        <p>Document interne de suivi de caisse — arrêté à la date d'édition.</p>
        <p style="margin-top:26px">Visa du responsable : ____________________</p>
      </div>
      <div class="cachet">${esc(store.name)}<small>Cachet &amp; Signature</small></div>
    </div>

    <div class="foot">Journal de caisse généré par ${esc(store.name)}${store.phone ? ` — ${esc(store.phone)}` : ''} — ${formatDate(todayISO())}</div>
  </div>`;
}
