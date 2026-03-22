"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteBudget, getBudgets, upsertBudget } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { BudgetItem } from "@/types/finance";

function formatMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export default function BudgetsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null); // category_id en edición
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getBudgets()
      .then(setBudgets)
      .catch(() => setError("No se pudieron cargar los presupuestos"))
      .finally(() => setLoading(false));
  }, [user]);

  function startEdit(item: BudgetItem) {
    setEditing(item.category_id);
    setInputValue(item.amount !== null ? String(item.amount) : "");
  }

  function cancelEdit() {
    setEditing(null);
    setInputValue("");
  }

  async function handleSave(categoryId: number) {
    const amount = parseFloat(inputValue);
    if (!inputValue || isNaN(amount) || amount <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await upsertBudget(categoryId, amount);
      setBudgets((prev) =>
        prev.map((b) =>
          b.category_id === categoryId
            ? { ...b, amount, budget_id: b.budget_id ?? -1 }
            : b
        )
      );
      setEditing(null);
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(categoryId: number) {
    if (!confirm("¿Quitar este presupuesto?")) return;
    try {
      await deleteBudget(categoryId);
      setBudgets((prev) =>
        prev.map((b) =>
          b.category_id === categoryId
            ? { ...b, amount: null, budget_id: null }
            : b
        )
      );
    } catch {
      setError("Error al eliminar");
    }
  }

  if (authLoading || !user) return null;

  const withBudget = budgets.filter((b) => b.amount !== null);
  const withoutBudget = budgets.filter((b) => b.amount === null);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">💰 Presupuestos</h1>
            <p className="text-gray-400 text-sm mt-1">
              Límite mensual por categoría de gasto
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition text-sm"
          >
            ← Dashboard
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Cargando...</div>
        ) : (
          <>
            {/* Categorías con presupuesto */}
            {withBudget.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                  Con presupuesto ({withBudget.length})
                </h2>
                <div className="space-y-2">
                  {withBudget.map((item) => (
                    <BudgetRow
                      key={item.category_id}
                      item={item}
                      isEditing={editing === item.category_id}
                      inputValue={inputValue}
                      saving={saving}
                      onEdit={() => startEdit(item)}
                      onCancel={cancelEdit}
                      onSave={() => handleSave(item.category_id)}
                      onDelete={() => handleDelete(item.category_id)}
                      onInputChange={setInputValue}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Categorías sin presupuesto */}
            {withoutBudget.length > 0 && (
              <div>
                <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">
                  Sin presupuesto ({withoutBudget.length})
                </h2>
                <div className="space-y-2">
                  {withoutBudget.map((item) => (
                    <BudgetRow
                      key={item.category_id}
                      item={item}
                      isEditing={editing === item.category_id}
                      inputValue={inputValue}
                      saving={saving}
                      onEdit={() => startEdit(item)}
                      onCancel={cancelEdit}
                      onSave={() => handleSave(item.category_id)}
                      onDelete={() => handleDelete(item.category_id)}
                      onInputChange={setInputValue}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ─── Componente fila ──────────────────────────────────────────────────────────

interface BudgetRowProps {
  item: BudgetItem;
  isEditing: boolean;
  inputValue: string;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onInputChange: (v: string) => void;
}

function BudgetRow({
  item,
  isEditing,
  inputValue,
  saving,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onInputChange,
}: BudgetRowProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4">
      <div className="flex items-center gap-3">
        {/* Icono con color */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: item.color + "30", border: `2px solid ${item.color}` }}
        >
          {item.icon}
        </div>

        {/* Nombre */}
        <span className="flex-1 text-gray-200 font-medium">{item.category_name}</span>

        {/* Monto o input */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSave()}
                autoFocus
                className="w-32 bg-gray-700 border border-gray-500 text-white rounded-lg pl-6 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50"
            >
              {saving ? "..." : "✓"}
            </button>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-white px-2 py-1.5 text-sm transition"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {item.amount !== null ? (
              <span className="text-white font-semibold">{formatMXN(item.amount)}</span>
            ) : (
              <span className="text-gray-600 text-sm italic">sin límite</span>
            )}
            <button
              onClick={onEdit}
              className="text-gray-500 hover:text-blue-400 transition text-sm"
              title="Editar"
            >
              ✏️
            </button>
            {item.amount !== null && (
              <button
                onClick={onDelete}
                className="text-gray-500 hover:text-red-400 transition text-sm"
                title="Quitar presupuesto"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
