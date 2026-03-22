"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteTransaction, duplicateTransaction, exportTransactions, getCategories, getTransactions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Category, Transaction } from "@/types/finance";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMXN(value: string | number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value));
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [typeFilter, setTypeFilter] = useState<"" | "income" | "expense">("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getCategories().then(setCategories).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    getTransactions(
      month,
      year,
      typeFilter || undefined,
      categoryFilter || undefined
    )
      .then(setTransactions)
      .catch(() => setError("No se pudieron cargar las transacciones"))
      .finally(() => setLoading(false));
  }, [user, month, year, typeFilter, categoryFilter]);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta transacción?")) return;
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicate(id: number) {
    setDuplicatingId(id);
    try {
      const newTx = await duplicateTransaction(id);
      // Solo añadimos al listado si la copia cae en el mes/año visible
      const txDate = new Date(newTx.date);
      if (txDate.getMonth() + 1 === month && txDate.getFullYear() === year) {
        setTransactions((prev) => [newTx, ...prev]);
      }
    } catch {
      alert("Error al duplicar");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportTransactions(month, year);
    } catch {
      alert("Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  if (authLoading || !user) return null;

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📋 Movimientos</h1>
            <p className="text-gray-400 mt-1">
              {MONTHS[month - 1]} {year}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={exporting || transactions.length === 0}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 text-sm"
              title="Descargar CSV del mes"
            >
              {exporting ? "⏳ Exportando..." : "⬇️ CSV"}
            </button>
            <Link
              href="/transactions/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              + Nueva
            </Link>
            <Link
              href="/dashboard"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | "income" | "expense")}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="income">Solo ingresos</option>
            <option value="expense">Solo egresos</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mini resumen */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Ingresos</p>
              <p className="text-green-400 font-bold">{formatMXN(totalIncome)}</p>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">Egresos</p>
              <p className="text-red-400 font-bold">{formatMXN(totalExpense)}</p>
            </div>
            <div
              className={`rounded-xl p-4 text-center border ${
                totalIncome - totalExpense >= 0
                  ? "bg-blue-900/30 border-blue-700"
                  : "bg-orange-900/30 border-orange-700"
              }`}
            >
              <p className="text-gray-400 text-xs mb-1">Balance</p>
              <p
                className={`font-bold ${
                  totalIncome - totalExpense >= 0 ? "text-blue-300" : "text-orange-300"
                }`}
              >
                {formatMXN(totalIncome - totalExpense)}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-lg p-4 mb-4">
            {error}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Cargando...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p>Sin movimientos para este período</p>
            <Link
              href="/transactions/new"
              className="mt-4 inline-block text-blue-400 hover:underline"
            >
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-600 transition"
              >
                {/* Icono */}
                <span className="text-2xl w-9 text-center">
                  {tx.category_detail?.icon ?? "📌"}
                </span>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">
                    {tx.description || tx.category_detail?.name || "Sin descripción"}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {tx.category_detail?.name} · {tx.date}
                  </p>
                </div>
                {/* Monto */}
                <span
                  className={`text-lg font-bold whitespace-nowrap ${
                    tx.type === "income" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatMXN(tx.amount)}
                </span>
                {/* Acciones */}
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleDuplicate(tx.id)}
                    disabled={duplicatingId === tx.id}
                    className="text-gray-500 hover:text-green-400 transition text-sm disabled:opacity-50"
                    title="Duplicar con fecha de hoy"
                  >
                    {duplicatingId === tx.id ? "⏳" : "📋"}
                  </button>
                  <Link
                    href={`/transactions/new?edit=${tx.id}`}
                    className="text-gray-500 hover:text-blue-400 transition text-sm"
                    title="Editar"
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className="text-gray-500 hover:text-red-400 transition text-sm disabled:opacity-50"
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
