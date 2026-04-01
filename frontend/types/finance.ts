export type CategoryType = "income" | "expense" | "both";
export type TransactionType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export interface Transaction {
  id: number;
  amount: string;
  description: string;
  date: string;
  type: TransactionType;
  category: number | null;
  category_detail: Category | null;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface CategorySummary {
  category_id: number;
  category: string;
  color: string;
  icon: string;
  type: TransactionType;
  total: number;
  budget: number | null;
  pct_used: number | null;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  label: string;
  income: number;
  expense: number;
}

export interface Summary {
  month: number;
  year: number;
  total_income: number;
  total_expense: number;
  balance: number;
  by_category: CategorySummary[];
  monthly_trend: MonthlyTrend[];
}

export interface BudgetItem {
  category_id: number;
  category_name: string;
  icon: string;
  color: string;
  budget_id: number | null;
  amount: number | null;
}

// ─── Tarjetas de Crédito ─────────────────────────────────────────────────────

export interface CreditCard {
  id: number;
  owner: string;
  nombre: string;
  banco: string;
  ultimos_4: string;
  color: string;
  limite_credito: string;
  limite_mensual: string;
  corte_dia: number;
  pago_dia: number;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export type CardPaymentType = "minimo" | "total" | "parcial";

export interface CardExpense {
  id: number;
  card: number;
  descripcion: string;
  fecha: string;
  monto_total: string;
  es_msi: boolean;
  meses: number;
  mensualidad: string;
  pagado: boolean;
  created_at: string;
}

export interface CardPayment {
  id: number;
  card: number;
  fecha: string;
  monto: string;
  tipo: CardPaymentType;
  pago_minimo: string | null;
  notas: string;
  created_at: string;
}

export interface CardSummary {
  card: CreditCard;
  saldo_total: number;
  disponible: number;
  limite_credito: number;
  limite_mensual: number;
  mensualidades_periodo: number;
  pct_credito: number;
  pct_mensual: number;
  prox_corte: string;
  prox_pago: string;
  dias_para_corte: number;
  inicio_periodo: string;
  fin_periodo: string;
  gastos_periodo: CardExpense[];
}

// Datos para crear/editar tarjeta
export interface CreditCardFormData {
  nombre: string;
  banco: string;
  ultimos_4: string;
  color: string;
  limite_credito: string;
  limite_mensual: string;
  corte_dia: number;
  pago_dia: number;
}

// Datos para crear gasto
export interface CardExpenseFormData {
  descripcion: string;
  fecha: string;
  monto_total: string;
  es_msi: boolean;
  meses: number;
}

// Datos para registrar pago
export interface CardPaymentFormData {
  fecha: string;
  monto: string;
  tipo: CardPaymentType;
  pago_minimo: string;
  notas: string;
}
