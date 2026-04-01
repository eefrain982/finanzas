"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import {
  getCardSummary,
  getCardPayments,
  createCardExpense,
  updateCardExpense,
  deleteCardExpense,
  createCardPayment,
  deleteCardPayment,
} from "../../../lib/api";
import type {
  CardSummary,
  CardExpense,
  CardPayment,
  CardExpenseFormData,
  CardPaymentFormData,
} from "../../../types/finance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | string) {
  return Number(n).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pctColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-emerald-500";
}
function pctText(pct: number) {
  if (pct >= 90) return "text-red-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-emerald-400";
}

const MSI_OPTIONS = [3, 6, 9, 12, 18, 24];

const EMPTY_EXPENSE: CardExpenseFormData = {
  descripcion: "",
  fecha: new Date().toISOString().slice(0, 10),
  monto_total: "",
  es_msi: false,
  meses: 1,
};

const EMPTY_PAYMENT: CardPaymentFormData = {
  fecha: new Date().toISOString().slice(0, 10),
  monto: "",
  tipo: "total",
  pago_minimo: "",
  notas: "",
};

// ─── Modal: Agregar / Editar Gasto ───────────────────────────────────────────

function ExpenseModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: CardExpenseFormData & { id?: number };
  onSave: (data: CardExpenseFormData, id?: number) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CardExpenseFormData>({ ...initial });
  function set<K extends keyof CardExpenseFormData>(k: K, v: CardExpenseFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const mensualidad =
    form.es_msi && form.meses > 1 && form.monto_total
      ? (Number(form.monto_total) / form.meses).toFixed(2)
      : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">
          {initial.id ? "✏️ Editar gasto" : "➕ Nuevo gasto"}
        </h2>

        {/* Descripción */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descripción *</label>
          <input
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
            placeholder="Amazon, Gasolina, Restaurante..."
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
          />
        </div>

        {/* Monto y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Monto total *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="0.00"
                value={form.monto_total}
                onChange={(e) => set("monto_total", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fecha *</label>
            <input
              type="date"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
            />
          </div>
        </div>

        {/* MSI toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => {
                set("es_msi", !form.es_msi);
                if (!form.es_msi) set("meses", 3);
                else set("meses", 1);
              }}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                form.es_msi ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.es_msi ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span className="text-sm text-gray-300">¿Es a meses sin intereses (MSI)?</span>
          </label>
        </div>

        {/* Selector de meses */}
        {form.es_msi && (
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Número de meses</label>
            <div className="flex gap-2 flex-wrap">
              {MSI_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("meses", m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    form.meses === m
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {mensualidad && (
              <p className="text-xs text-emerald-400 mt-2">
                Mensualidad: <span className="font-semibold">${mensualidad}</span> / mes
              </p>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form, initial.id)}
            disabled={saving || !form.descripcion || !form.monto_total || !form.fecha}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Registrar Pago ───────────────────────────────────────────────────

function PaymentModal({
  saldoTotal,
  onSave,
  onClose,
  saving,
}: {
  saldoTotal: number;
  onSave: (data: CardPaymentFormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CardPaymentFormData>({
    ...EMPTY_PAYMENT,
    monto: saldoTotal.toFixed(2),
    tipo: "total",
  });
  function set<K extends keyof CardPaymentFormData>(k: K, v: CardPaymentFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">💸 Registrar pago</h2>

        {/* Tipo de pago */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Tipo de pago *</label>
          <div className="grid grid-cols-3 gap-2">
            {(["minimo", "total", "parcial"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  set("tipo", t);
                  if (t === "total") set("monto", saldoTotal.toFixed(2));
                }}
                className={`py-2 rounded-lg text-sm font-medium transition capitalize ${
                  form.tipo === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {t === "minimo" ? "Mínimo" : t === "total" ? "Total" : "Parcial"}
              </button>
            ))}
          </div>
        </div>

        {/* Monto y fecha */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Monto pagado *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                value={form.monto}
                onChange={(e) => set("monto", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fecha *</label>
            <input
              type="date"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
            />
          </div>
        </div>

        {/* Pago mínimo (manual) */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Pago mínimo indicado por el banco{" "}
            <span className="text-gray-600">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="0.00"
              value={form.pago_minimo}
              onChange={(e) => set("pago_minimo", e.target.value)}
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Notas <span className="text-gray-600">(opcional)</span>
          </label>
          <input
            className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
            placeholder="Ej: Pago desde app BBVA"
            value={form.notas}
            onChange={(e) => set("notas", e.target.value)}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.monto || !form.fecha}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CardDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const cardId = Number(params.id);

  const [summary, setSummary] = useState<CardSummary | null>(null);
  const [payments, setPayments] = useState<CardPayment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Modales
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<(CardExpenseFormData & { id?: number }) | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const reload = useCallback(async () => {
    if (!user || !cardId) return;
    try {
      const [s, p] = await Promise.all([
        getCardSummary(cardId),
        getCardPayments(cardId),
      ]);
      setSummary(s);
      setPayments(p);
    } catch {
      setError("No se pudo cargar la información de la tarjeta");
    } finally {
      setLoadingData(false);
    }
  }, [user, cardId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── Gastos ────────────────────────────────────────────────────────────────

  function openAddExpense() {
    setEditExpense({ ...EMPTY_EXPENSE });
    setShowExpenseModal(true);
  }

  function openEditExpense(expense: CardExpense) {
    setEditExpense({
      id: expense.id,
      descripcion: expense.descripcion,
      fecha: expense.fecha,
      monto_total: expense.monto_total,
      es_msi: expense.es_msi,
      meses: expense.meses,
    });
    setShowExpenseModal(true);
  }

  async function handleSaveExpense(data: CardExpenseFormData, id?: number) {
    setSaving(true);
    try {
      if (id) {
        await updateCardExpense(cardId, id, data);
      } else {
        await createCardExpense(cardId, data);
      }
      setShowExpenseModal(false);
      await reload();
    } catch {
      setError("Error al guardar el gasto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm("¿Eliminar este gasto?")) return;
    setDeletingExpenseId(id);
    try {
      await deleteCardExpense(cardId, id);
      await reload();
    } catch {
      setError("Error al eliminar el gasto");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────

  async function handleSavePayment(data: CardPaymentFormData) {
    setSaving(true);
    try {
      await createCardPayment(cardId, data);
      setShowPaymentModal(false);
      await reload();
    } catch {
      setError("Error al registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(id: number) {
    if (!confirm("¿Eliminar este registro de pago?")) return;
    setDeletingPaymentId(id);
    try {
      await deleteCardPayment(cardId, id);
      await reload();
    } catch {
      setError("Error al eliminar el pago");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || loadingData) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando tarjeta...</p>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No se encontró la tarjeta</p>
          <Link href="/cards" className="text-indigo-400 hover:underline">
            ← Volver a tarjetas
          </Link>
        </div>
      </main>
    );
  }

  const { card } = summary;
  // Todos los gastos no solo del periodo
  const allExpenses = summary.gastos_periodo;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Link href="/" className="hover:text-white transition">🏠 Inicio</Link>
            <span>/</span>
            <Link href="/cards" className="hover:text-white transition">💳 Tarjetas</Link>
            <span>/</span>
            <span className="text-white">{card.nombre}</span>
          </div>
          <Link
            href="/cards"
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition"
          >
            ← Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
            <button onClick={() => setError("")} className="ml-3 underline text-xs">
              Cerrar
            </button>
          </div>
        )}

        {/* ── Header tarjeta ─────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 border border-gray-800"
          style={{ background: `linear-gradient(135deg, ${card.color}22, transparent)` }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: card.color }}
                />
                <h1 className="text-2xl font-bold">{card.nombre}</h1>
              </div>
              <p className="text-gray-400 text-sm">
                {card.banco}{card.ultimos_4 ? ` ···${card.ultimos_4}` : ""}
              </p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Periodo</p>
              <p className="text-white font-medium">
                {fmtDate(summary.inicio_periodo)} → {fmtDate(summary.fin_periodo)}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Saldo total", value: fmt(summary.saldo_total), sub: "afecta tope" },
              { label: "Disponible", value: fmt(summary.disponible), sub: `de ${fmt(summary.limite_credito)}` },
              { label: "Pago mensual", value: fmt(summary.mensualidades_periodo), sub: `de ${fmt(summary.limite_mensual)}` },
              {
                label: summary.dias_para_corte === 0 ? "Corte HOY" : `Corte en ${summary.dias_para_corte}d`,
                value: fmtDate(summary.prox_corte),
                sub: `Pago: ${fmtDate(summary.prox_pago)}`,
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-white font-bold text-sm leading-tight">{value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Barras */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Crédito usado</span>
                <span className={pctText(summary.pct_credito)}>
                  {summary.pct_credito}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${pctColor(summary.pct_credito)}`}
                  style={{ width: `${Math.min(summary.pct_credito, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Gasto mensual</span>
                <span className={pctText(summary.pct_mensual)}>
                  {summary.pct_mensual}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${pctColor(summary.pct_mensual)}`}
                  style={{ width: `${Math.min(summary.pct_mensual, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Gastos del periodo ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">📄 Gastos del periodo</h2>
            <button
              onClick={openAddExpense}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + Agregar gasto
            </button>
          </div>

          {allExpenses.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No hay gastos en este periodo</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Descripción</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Fecha</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-right px-4 py-3">Mensualidad</th>
                    <th className="text-center px-4 py-3 hidden sm:table-cell">MSI</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {allExpenses.map((e) => (
                    <tr
                      key={e.id}
                      className={`border-b border-gray-800 last:border-0 transition ${
                        deletingExpenseId === e.id ? "opacity-40" : "hover:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {e.descripcion}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                        {fmtDate(e.fecha)}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">
                        {fmt(e.monto_total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.es_msi ? (
                          <span className="text-emerald-400 font-medium">
                            {fmt(e.mensualidad)}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {e.es_msi ? (
                          <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">
                            {e.meses} MSI
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.pagado ? (
                          <span className="text-emerald-400 text-xs">✅ Pagado</span>
                        ) : (
                          <span className="text-yellow-400 text-xs">⏳ Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => openEditExpense(e)}
                            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition"
                            title="Editar"
                          >✏️</button>
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700 transition"
                            title="Eliminar"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totales */}
                <tfoot>
                  <tr className="bg-gray-800/50 text-sm font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-gray-400">Total del periodo</td>
                    <td className="px-4 py-3 text-right text-white">
                      {fmt(allExpenses.reduce((s, e) => s + Number(e.monto_total), 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {fmt(allExpenses.reduce((s, e) => s + Number(e.mensualidad), 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* ── Historial de pagos ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">💸 Historial de pagos</h2>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              + Registrar pago
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-right px-4 py-3">Pagado</th>
                    <th className="text-right px-4 py-3 hidden sm:table-cell">Pago mínimo</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Notas</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-800 last:border-0 transition ${
                        deletingPaymentId === p.id ? "opacity-40" : "hover:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-300">{fmtDate(p.fecha)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.tipo === "total"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : p.tipo === "minimo"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {p.tipo === "total"
                            ? "Total"
                            : p.tipo === "minimo"
                            ? "Mínimo"
                            : "Parcial"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">
                        {fmt(p.monto)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 hidden sm:table-cell">
                        {p.pago_minimo ? fmt(p.pago_minimo) : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {p.notas || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700 transition"
                          title="Eliminar pago"
                        >🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modales */}
      {showExpenseModal && editExpense && (
        <ExpenseModal
          initial={editExpense}
          onSave={handleSaveExpense}
          onClose={() => setShowExpenseModal(false)}
          saving={saving}
        />
      )}
      {showPaymentModal && (
        <PaymentModal
          saldoTotal={summary.saldo_total}
          onSave={handleSavePayment}
          onClose={() => setShowPaymentModal(false)}
          saving={saving}
        />
      )}
    </main>
  );
}
