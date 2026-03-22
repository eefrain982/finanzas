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
