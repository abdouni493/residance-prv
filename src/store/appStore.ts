import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  StoreInfo,
  Client,
  Room,
  Floor,
  Category,
  Service,
  Reservation,
  Worker,
  Expense,
  ExpenseCategory,
  Maintenance,
  CashTransaction,
  Payment,
  Advance,
  Absence,
  WorkerPayment,
  Permissions,
  ModuleKey,
} from '@/types';
import { createInitialData, type AppData } from '@/data/seed';
import { STORE_INFO } from '@/data/constants';
import { uid } from '@/lib/utils';

interface AuthState {
  user: User | null;
  accounts: User[];
}

interface AppState extends AppData, AuthState {
  storeInfo: StoreInfo;

  // ---- Auth ----
  login: (identifier: string, password: string) => boolean;
  signup: (p: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
  }) => { ok: boolean; error?: string };
  logout: () => void;
  updateAccount: (patch: Partial<User>) => void;
  changePassword: (oldPw: string, newPw: string) => boolean;

  // ---- Clients ----
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // ---- Rooms / floors / categories ----
  addRoom: (r: Omit<Room, 'id' | 'status'>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
  setRoomMaintenance: (id: string, note?: string) => void;
  endRoomMaintenance: (id: string) => void;
  addFloor: (name: string) => void;
  deleteFloor: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;

  // ---- Services ----
  addService: (s: Omit<Service, 'id'>) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // ---- Reservations ----
  addReservation: (r: Omit<Reservation, 'id' | 'code' | 'createdAt'>) => void;
  updateReservation: (id: string, patch: Partial<Reservation>) => void;
  deleteReservation: (id: string) => void;
  addPayment: (resId: string, amount: number, note?: string) => void;

  // ---- Workers ----
  addWorker: (w: Omit<Worker, 'id' | 'advances' | 'absences' | 'payments'>) => void;
  updateWorker: (id: string, patch: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  addWorkerAdvance: (workerId: string, a: Omit<Advance, 'id' | 'deducted'>) => void;
  addWorkerAbsence: (workerId: string, a: Omit<Absence, 'id'>) => void;
  addWorkerPayment: (workerId: string, p: Omit<WorkerPayment, 'id'>) => void;
  setWorkerPermissions: (workerId: string, perms: Permissions) => void;
  addRole: (name: string) => void;

  // ---- Expenses ----
  addExpense: (e: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addExpenseCategory: (name: string) => void;
  deleteExpenseCategory: (id: string) => void;

  // ---- Maintenances ----
  addMaintenance: (m: Omit<Maintenance, 'id'>) => void;
  deleteMaintenance: (id: string) => void;

  // ---- Cash ----
  addCashTransaction: (t: Omit<CashTransaction, 'id'>) => void;

  // ---- Settings / data ----
  updateStoreInfo: (patch: Partial<StoreInfo>) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => void;
}

const initial = createInitialData();

function nextResCode(reservations: Reservation[]): string {
  const max = reservations.reduce((m, r) => {
    const n = parseInt(r.code.replace(/\D/g, ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `RES-${String(max + 1).padStart(3, '0')}`;
}

function deriveStatus(total: number, payments: Payment[], current: Reservation): Reservation['status'] {
  if (current.status === 'cancelled') return 'cancelled';
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid >= total) {
    const today = new Date().toISOString().slice(0, 10);
    const active = current.checkIn <= today && today < current.checkOut;
    return active ? 'active' : 'paid';
  }
  return 'debt';
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,
      storeInfo: STORE_INFO,
      user: null,
      accounts: [],

      // ---------------- AUTH ----------------
      login: (identifier, password) => {
        const id = identifier.trim().toLowerCase();
        const admin = get().accounts.find(
          (a) =>
            (a.email.toLowerCase() === id || a.username.toLowerCase() === id) &&
            a.password === password,
        );
        if (admin) {
          set({ user: admin });
          return true;
        }
        // Worker accounts
        const worker = get().workers.find(
          (w) =>
            w.hasAccount &&
            w.account &&
            (w.account.email.toLowerCase() === id || w.account.username.toLowerCase() === id) &&
            w.account.password === password,
        );
        if (worker && worker.account) {
          set({
            user: {
              id: `user-${worker.id}`,
              name: worker.name,
              username: worker.account.username,
              email: worker.account.email,
              password: worker.account.password,
              role: 'worker',
              avatar: null,
              workerId: worker.id,
            },
          });
          return true;
        }
        return false;
      },

      signup: (p) => {
        const exists = get().accounts.some(
          (a) =>
            a.email.toLowerCase() === p.email.toLowerCase() ||
            a.username.toLowerCase() === p.username.toLowerCase(),
        );
        if (exists) return { ok: false, error: 'Email ou nom d’utilisateur déjà utilisé' };
        const user: User = {
          id: uid('admin'),
          name: `${p.firstName} ${p.lastName}`,
          username: p.username,
          email: p.email,
          password: p.password,
          role: 'admin',
          avatar: null,
        };
        set((s) => ({ accounts: [...s.accounts, user], user }));
        return { ok: true };
      },

      logout: () => set({ user: null }),

      updateAccount: (patch) =>
        set((s) => {
          if (!s.user) return {};
          const updated = { ...s.user, ...patch };
          return {
            user: updated,
            accounts: s.accounts.map((a) => (a.id === updated.id ? updated : a)),
          };
        }),

      changePassword: (oldPw, newPw) => {
        const u = get().user;
        if (!u || u.password !== oldPw) return false;
        get().updateAccount({ password: newPw });
        return true;
      },

      // ---------------- CLIENTS ----------------
      addClient: (c) => {
        const client: Client = { ...c, id: uid('client'), createdAt: new Date().toISOString().slice(0, 10) };
        set((s) => ({ clients: [client, ...s.clients] }));
        return client;
      },
      updateClient: (id, patch) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),

      // ---------------- ROOMS ----------------
      addRoom: (r) =>
        set((s) => ({ rooms: [...s.rooms, { ...r, id: uid('room'), status: 'available' }] })),
      updateRoom: (id, patch) =>
        set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRoom: (id) => set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
      setRoomMaintenance: (id, note) =>
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === id ? { ...r, status: 'maintenance', maintenanceNote: note } : r,
          ),
        })),
      endRoomMaintenance: (id) =>
        set((s) => ({
          rooms: s.rooms.map((r) =>
            r.id === id ? { ...r, status: 'available', maintenanceNote: undefined } : r,
          ),
        })),
      addFloor: (name) =>
        set((s) => ({ floors: [...s.floors, { id: uid('floor'), name }] })),
      deleteFloor: (id) =>
        set((s) => ({
          floors: s.floors.filter((f) => f.id !== id),
          rooms: s.rooms.filter((r) => r.floorId !== id),
        })),
      addCategory: (name) =>
        set((s) => ({ categories: [...s.categories, { id: uid('cat'), name }] })),
      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      // ---------------- SERVICES ----------------
      addService: (svc) => set((s) => ({ services: [...s.services, { ...svc, id: uid('svc') }] })),
      updateService: (id, patch) =>
        set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),

      // ---------------- RESERVATIONS ----------------
      addReservation: (r) =>
        set((s) => {
          const code = nextResCode(s.reservations);
          const full: Reservation = {
            ...r,
            id: uid('res'),
            code,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          full.status = deriveStatus(full.total, full.payments, full);
          return { reservations: [full, ...s.reservations] };
        }),
      updateReservation: (id, patch) =>
        set((s) => ({
          reservations: s.reservations.map((r) => {
            if (r.id !== id) return r;
            const merged = { ...r, ...patch };
            merged.status = deriveStatus(merged.total, merged.payments, merged);
            return merged;
          }),
        })),
      deleteReservation: (id) =>
        set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),
      addPayment: (resId, amount, note) =>
        set((s) => ({
          reservations: s.reservations.map((r) => {
            if (r.id !== resId) return r;
            const payment: Payment = {
              id: uid('pay'),
              amount,
              date: new Date().toISOString().slice(0, 10),
              note,
            };
            const payments = [...r.payments, payment];
            const merged = { ...r, payments };
            merged.status = deriveStatus(merged.total, payments, merged);
            return merged;
          }),
        })),

      // ---------------- WORKERS ----------------
      addWorker: (w) =>
        set((s) => ({
          workers: [
            ...s.workers,
            { ...w, id: uid('worker'), advances: [], absences: [], payments: [] },
          ],
        })),
      updateWorker: (id, patch) =>
        set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      deleteWorker: (id) => set((s) => ({ workers: s.workers.filter((w) => w.id !== id) })),
      addWorkerAdvance: (workerId, a) =>
        set((s) => ({
          workers: s.workers.map((w) =>
            w.id === workerId
              ? { ...w, advances: [...w.advances, { ...a, id: uid('adv'), deducted: false }] }
              : w,
          ),
        })),
      addWorkerAbsence: (workerId, a) =>
        set((s) => ({
          workers: s.workers.map((w) =>
            w.id === workerId
              ? { ...w, absences: [...w.absences, { ...a, id: uid('abs') }] }
              : w,
          ),
        })),
      addWorkerPayment: (workerId, p) =>
        set((s) => ({
          workers: s.workers.map((w) =>
            w.id === workerId
              ? {
                  ...w,
                  payments: [...w.payments, { ...p, id: uid('wpay') }],
                  advances: w.advances.map((adv) => ({ ...adv, deducted: true })),
                }
              : w,
          ),
        })),
      setWorkerPermissions: (workerId, perms) =>
        set((s) => ({
          workers: s.workers.map((w) => (w.id === workerId ? { ...w, permissions: perms } : w)),
        })),
      addRole: (name) =>
        set((s) => (s.roles.includes(name) ? {} : { roles: [...s.roles, name] })),

      // ---------------- EXPENSES ----------------
      addExpense: (e) => set((s) => ({ expenses: [{ ...e, id: uid('exp') }, ...s.expenses] })),
      updateExpense: (id, patch) =>
        set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
      addExpenseCategory: (name) =>
        set((s) => ({ expenseCategories: [...s.expenseCategories, { id: uid('ecat'), name }] })),
      deleteExpenseCategory: (id) =>
        set((s) => ({ expenseCategories: s.expenseCategories.filter((c) => c.id !== id) })),

      // ---------------- MAINTENANCES ----------------
      addMaintenance: (m) =>
        set((s) => ({ maintenances: [{ ...m, id: uid('maint') }, ...s.maintenances] })),
      deleteMaintenance: (id) =>
        set((s) => ({ maintenances: s.maintenances.filter((m) => m.id !== id) })),

      // ---------------- CASH ----------------
      addCashTransaction: (t) =>
        set((s) => ({ cashTransactions: [{ ...t, id: uid('cash') }, ...s.cashTransactions] })),

      // ---------------- SETTINGS / DATA ----------------
      updateStoreInfo: (patch) => set((s) => ({ storeInfo: { ...s.storeInfo, ...patch } })),
      exportData: () => {
        const s = get();
        const snapshot = {
          storeInfo: s.storeInfo,
          clients: s.clients,
          floors: s.floors,
          categories: s.categories,
          rooms: s.rooms,
          services: s.services,
          reservations: s.reservations,
          workers: s.workers,
          expenses: s.expenses,
          expenseCategories: s.expenseCategories,
          maintenances: s.maintenances,
          cashTransactions: s.cashTransactions,
          roles: s.roles,
        };
        return JSON.stringify(snapshot, null, 2);
      },
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          set({
            storeInfo: d.storeInfo ?? get().storeInfo,
            clients: d.clients ?? [],
            floors: d.floors ?? [],
            categories: d.categories ?? [],
            rooms: d.rooms ?? [],
            services: d.services ?? [],
            reservations: d.reservations ?? [],
            workers: d.workers ?? [],
            expenses: d.expenses ?? [],
            expenseCategories: d.expenseCategories ?? [],
            maintenances: d.maintenances ?? [],
            cashTransactions: d.cashTransactions ?? [],
            roles: d.roles ?? [],
          });
          return true;
        } catch {
          return false;
        }
      },
      resetData: () => set({ ...createInitialData(), storeInfo: STORE_INFO }),
    }),
    {
      name: 'residence-store',
      version: 4,
      migrate: (persisted): AppState => {
        const p = (persisted ?? {}) as Partial<AppState> & Record<string, unknown>;
        // Strip demo admin; clear all old seed collections so the app starts blank
        const accounts = Array.isArray(p.accounts)
          ? (p.accounts as User[]).filter((a: User) => a.id !== 'demo-admin')
          : [];
        return {
          ...createInitialData(),
          storeInfo: (p.storeInfo as StoreInfo | undefined) ?? STORE_INFO,
          accounts,
          user: null,
        } as unknown as AppState;
      },
    },
  ),
);

/** Permissions of the current user: admins get everything (null = full access). */
export function useCurrentPermissions(): Permissions | null {
  const user = useApp((s) => s.user);
  const workers = useApp((s) => s.workers);
  if (!user || user.role === 'admin') return null;
  const worker = workers.find((w) => w.id === user.workerId);
  return worker?.permissions ?? {};
}

export function canAccess(perms: Permissions | null, module: ModuleKey): boolean {
  if (perms === null) return true;
  const actions = perms[module];
  return !!actions && actions.length > 0;
}

export function can(perms: Permissions | null, module: ModuleKey, action: string): boolean {
  if (perms === null) return true;
  return !!perms[module]?.includes(action as never);
}
