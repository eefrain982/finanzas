"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  createTransaction,
  getCategories,
  getTransactions,
  updateTransaction,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Category } from "@/types/finance";

function formatDateLocal(date: Date) {
  return date.toISOString().split("T")[0];
}

function NewTransactionForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(formatDateLocal(new Date()));
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getCategories().then(setCategories).catch(() => {});
  }, [user]);

  // Si viene con ?edit=id cargamos la transacción
  useEffect(() => {
    if (!editId || !user) return;
    const today = new Date();
    getTransactions(today.getMonth() + 1, today.getFullYear())
      .then((all) => {
        // buscar en todos los meses no es trivial; cargamos del mes actual
        // Si no está, buscamos 3 meses hacia atrás
        const found = all.find((t) => t.id === Number(editId));
        if (found) {
          setType(found.type);
          setAmount(found.amount);
          setDescription(found.description);
          setDate(found.date);
          setCategoryId(found.category ?? "");
        }
      })
      .catch(() => {});
  }, [editId, user]);

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === "both"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !date) {
      setError("Monto y fecha son requeridos");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        amount: parseFloat(amount).toFixed(2),
        description,
        date,
        type,
        category: categoryId || null,
      };
      if (editId) {
        await updateTransaction(Number(editId), payload);
      } else {
        await createTransaction(payload);
      }
      router.push("/transactions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 flex items-start justify-center pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <Link href="/transactions" className="text-gray-500 hover:text-white text-sm mb-3 inline-block transition">
            ← Volver a movimientos
          </Link>
          <h1 className="text-2xl font-bold">
            {editId ? "✏️ Editar transacción" : "➕ Nueva transacción"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo: ingreso / egreso */}
          <div className="flex rounded-xl overflow-hidden border border-gray-700">
            <button
              type="button"
              onClick={() => { setType("income"); setCategoryId(""); }}
              className={`flex-1 py-3 font-semibold transition ${
                type === "income"
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              💰 Ingreso
            </button>
            <button
              type="button"
              onClick={() => { setType("expense"); setCategoryId(""); }}
              className={`flex-1 py-3 font-semibold transition ${
                type === "expense"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              💸 Egreso
            </button>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Monto (MXN)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            >
              <option value="">Sin categoría</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Descripción <span className="text-gray-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Despensa del martes"
              maxLength={255}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-600 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-xl font-semibold text-white transition ${
              type === "income"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            } disabled:opacity-50`}
          >
            {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar transacción"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Cargando...</div>}>
      <NewTransactionForm />
    </Suspense>
  );
}
