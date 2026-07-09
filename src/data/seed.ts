import type {
  Client,
  Floor,
  Category,
  Room,
  Service,
  Reservation,
  Worker,
  Expense,
  ExpenseCategory,
  Maintenance,
  CashTransaction,
  ExpenseCashTransaction,
} from '@/types';

export interface AppData {
  clients: Client[];
  floors: Floor[];
  categories: Category[];
  rooms: Room[];
  services: Service[];
  reservations: Reservation[];
  workers: Worker[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  maintenances: Maintenance[];
  cashTransactions: CashTransaction[];
  expenseCashTransactions: ExpenseCashTransaction[];
  roles: string[];
}

export function createInitialData(): AppData {
  return {
    clients: [],
    floors: [],
    categories: [],
    rooms: [],
    services: [],
    reservations: [],
    workers: [],
    expenses: [],
    expenseCategories: [],
    maintenances: [],
    cashTransactions: [],
    expenseCashTransactions: [],
    roles: [],
  };
}
