const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

/** Intenta renovar el access token usando el refresh token guardado.
 *  Devuelve el nuevo access token, o null si no se pudo renovar. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh =
    typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

  if (!refresh) return null;

  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    // Refresh expirado → limpiar sesión
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return null;
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  // simplejwt con ROTATE_REFRESH_TOKENS devuelve un nuevo refresh también
  if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
  return data.access;
}

/** Helper principal. Reintenta automáticamente con token renovado si recibe 401. */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  // Si el token expiró, intentamos renovarlo y reintentamos una vez
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: buildHeaders(newToken, options.headers),
      });
    }
  }

  return res;
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

import type { Category, Summary, Transaction } from "@/types/finance";

export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch("/finance/categories/");
  if (!res.ok) throw new Error("Error al cargar categorías");
  return res.json();
}

export async function getSummary(month: number, year: number): Promise<Summary> {
  const res = await apiFetch(`/finance/summary/?month=${month}&year=${year}`);
  if (!res.ok) throw new Error("Error al cargar resumen");
  return res.json();
}

export async function getTransactions(
  month: number,
  year: number,
  type?: "income" | "expense",
  category?: number
): Promise<Transaction[]> {
  let url = `/finance/transactions/?month=${month}&year=${year}`;
  if (type) url += `&type=${type}`;
  if (category) url += `&category=${category}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Error al cargar transacciones");
  return res.json();
}

export async function createTransaction(data: {
  amount: string;
  description: string;
  date: string;
  type: "income" | "expense";
  category: number | null;
}): Promise<Transaction> {
  const res = await apiFetch("/finance/transactions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateTransaction(
  id: number,
  data: Partial<{
    amount: string;
    description: string;
    date: string;
    type: "income" | "expense";
    category: number | null;
  }>
): Promise<Transaction> {
  const res = await apiFetch(`/finance/transactions/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar transacción");
  return res.json();
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await apiFetch(`/finance/transactions/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar transacción");
}

export async function getTransactionById(id: number): Promise<Transaction> {
  const res = await apiFetch(`/finance/transactions/${id}/`);
  if (!res.ok) throw new Error("Transacción no encontrada");
  return res.json();
}

export async function exportTransactions(
  month: number,
  year: number
): Promise<void> {
  const res = await apiFetch(
    `/finance/transactions/export/?month=${month}&year=${year}`
  );
  if (!res.ok) throw new Error("Error al exportar");
  // Descargamos el blob como archivo
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transacciones_${year}_${String(month).padStart(2, "0")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function duplicateTransaction(id: number): Promise<Transaction> {
  const res = await apiFetch(`/finance/transactions/${id}/duplicate/`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Error al duplicar transacción");
  return res.json();
}

// ─── Presupuestos ─────────────────────────────────────────────────────────────

import type { BudgetItem } from "@/types/finance";

export async function getBudgets(): Promise<BudgetItem[]> {
  const res = await apiFetch("/finance/budgets/");
  if (!res.ok) throw new Error("Error al cargar presupuestos");
  return res.json();
}

export async function upsertBudget(
  categoryId: number,
  amount: number
): Promise<void> {
  const res = await apiFetch(`/finance/budgets/${categoryId}/`, {
    method: "PUT",
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Error al guardar presupuesto");
}

export async function deleteBudget(categoryId: number): Promise<void> {
  const res = await apiFetch(`/finance/budgets/${categoryId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar presupuesto");
}

// ─── Tarjetas de Crédito ─────────────────────────────────────────────────────

import type {
  CreditCard,
  CreditCardFormData,
  CardExpense,
  CardExpenseFormData,
  CardPayment,
  CardPaymentFormData,
  CardStatement,
  StatementPayFormData,
  CardSummary,
} from "@/types/finance";

export async function getCards(): Promise<CreditCard[]> {
  const res = await apiFetch("/finance/cards/");
  if (!res.ok) throw new Error("Error al cargar tarjetas");
  return res.json();
}

export async function createCard(data: CreditCardFormData): Promise<CreditCard> {
  const res = await apiFetch("/finance/cards/", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateCard(
  id: number,
  data: Partial<CreditCardFormData>
): Promise<CreditCard> {
  const res = await apiFetch(`/finance/cards/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar tarjeta");
  return res.json();
}

export async function deleteCard(id: number): Promise<void> {
  const res = await apiFetch(`/finance/cards/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar tarjeta");
}

export async function getCardSummary(id: number): Promise<CardSummary> {
  const res = await apiFetch(`/finance/cards/${id}/summary/`);
  if (!res.ok) throw new Error("Error al cargar resumen de tarjeta");
  return res.json();
}

export async function getCardExpenses(id: number): Promise<CardExpense[]> {
  const res = await apiFetch(`/finance/cards/${id}/expenses/`);
  if (!res.ok) throw new Error("Error al cargar gastos de tarjeta");
  return res.json();
}

export async function createCardExpense(
  cardId: number,
  data: CardExpenseFormData
): Promise<CardExpense> {
  const res = await apiFetch(`/finance/cards/${cardId}/expenses/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function updateCardExpense(
  cardId: number,
  expenseId: number,
  data: Partial<CardExpenseFormData>
): Promise<CardExpense> {
  const res = await apiFetch(`/finance/cards/${cardId}/expenses/${expenseId}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al actualizar gasto");
  return res.json();
}

export async function deleteCardExpense(
  cardId: number,
  expenseId: number
): Promise<void> {
  const res = await apiFetch(`/finance/cards/${cardId}/expenses/${expenseId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar gasto");
}

export async function getCardPayments(id: number): Promise<CardPayment[]> {
  const res = await apiFetch(`/finance/cards/${id}/payments/`);
  if (!res.ok) throw new Error("Error al cargar pagos");
  return res.json();
}

export async function createCardPayment(
  cardId: number,
  data: CardPaymentFormData
): Promise<CardPayment> {
  const res = await apiFetch(`/finance/cards/${cardId}/payments/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

export async function deleteCardPayment(
  cardId: number,
  paymentId: number
): Promise<void> {
  const res = await apiFetch(`/finance/cards/${cardId}/payments/${paymentId}/`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Error al eliminar pago");
}

// ─── Estados de Cuenta ───────────────────────────────────────────────────────

export async function getCardStatements(cardId: number): Promise<CardStatement[]> {
  const res = await apiFetch(`/finance/cards/${cardId}/statements/`);
  if (!res.ok) throw new Error("Error al cargar estados de cuenta");
  return res.json();
}

export async function closeCardStatement(cardId: number): Promise<CardStatement> {
  const res = await apiFetch(`/finance/cards/${cardId}/statements/close/`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al cerrar estado de cuenta");
  }
  return res.json();
}

export async function payCardStatement(
  cardId: number,
  statementId: number,
  data: StatementPayFormData
): Promise<CardStatement> {
  const res = await apiFetch(
    `/finance/cards/${cardId}/statements/${statementId}/pay/`,
    { method: "POST", body: JSON.stringify(data) }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al registrar pago");
  }
  return res.json();
}
