"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../hooks/useAuth";
import {
  getCardSummary,
  getCardStatements,
  createCardExpense,
  updateCardExpense,
  deleteCardExpense,
  closeCardStatement,
  payCardStatement,
} from "../../../lib/api";
import type {
  CardSummary,
  CardExpense,
  CardStatement,
  CardExpenseFormData,
  StatementPayFormData,
} from "../../../types/finance";

function fmt(n: number | string) {
  return Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
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

function ExpenseModal({
  initial, onSave, onClose, saving,
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
        <h2 className="text-lg font-bold text-white">{initial.id ? "✏️ Editar gasto" : "➕ Nuevo gasto"}</h2>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descripción *</label>
          <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
            placeholder="Amazon, Gasolina, Restaurante..."
            value={form.descripcion}
            onChange={(e) => set("descripcion", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Monto total *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01"
                className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                placeholder="0.00" value={form.monto_total}
                onChange={(e) => set("monto_total", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fecha *</label>
            <input type="date"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => { set("es_msi", !form.es_msi); set("meses", !form.es_msi ? 3 : 1); }}
              className={`w-10 h-5 rounded-full transition-colors relative ${form.es_msi ? "bg-indigo-600" : "bg-gray-700"}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.es_msi ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">¿Es a meses sin intereses (MSI)?</span>
          </label>
        </div>
        {form.es_msi && (
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Número de meses</label>
            <div className="flex gap-2 flex-wrap">
              {MSI_OPTIONS.map((m) => (
                <button key={m} type="button" onClick={() => set("meses", m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${form.meses === m ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
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
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition">
            Cancelar
          </button>
          <button onClick={() => onSave(form, initial.id)}
            disabled={saving || !form.descripcion || !form.monto_total || !form.fecha}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayStatementModal({
  statement, onSave, onClose, saving,
}: {
  statement: CardStatement;
  onSave: (data: StatementPayFormData) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<StatementPayFormData>({
    monto: statement.saldo_total,
    tipo: "total",
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
  });
  function set<K extends keyof StatementPayFormData>(k: K, v: StatementPayFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">💸 Pagar estado de cuenta</h2>
        <p className="text-sm text-gray-400">Periodo: {fmtDate(statement.inicio)} → {fmtDate(statement.fin)}</p>

        {/* Dos montos de referencia */}
        <div className="grid grid-cols-2 gap-3 bg-gray-800 rounded-xl p-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Sin generar intereses</p>
            <p className="text-xl font-bold text-emerald-400">{fmt(statement.saldo_total)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Saldo total periodo</p>
            <p className="text-xl font-bold text-white">{fmt(statement.saldo_periodo)}</p>
          </div>
          {statement.pago_minimo && (
            <div className="col-span-2 border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-500 mb-0.5">Pago mínimo</p>
              <p className="text-base font-semibold text-yellow-400">{fmt(statement.pago_minimo)}</p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-2 block">Tipo de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {(["minimo", "total", "parcial"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => {
                  set("tipo", t);
                  if (t === "total") set("monto", statement.saldo_total);
                  if (t === "minimo" && statement.pago_minimo) set("monto", statement.pago_minimo);
                }}
                className={`py-2 rounded-lg text-sm font-medium transition ${form.tipo === t ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                {t === "minimo" ? "Mínimo" : t === "total" ? "Sin intereses" : "Parcial"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Monto a pagar *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
              <input type="number" min="0" step="0.01"
                className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
                value={form.monto} onChange={(e) => set("monto", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Fecha de pago *</label>
            <input type="date"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notas <span className="text-gray-600">(opcional)</span></label>
          <input className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
            placeholder="Ej: Pago desde app BBVA"
            value={form.notas} onChange={(e) => set("notas", e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition">
            Cancelar
          </button>
          <button onClick={() => onSave(form)}
            disabled={saving || !form.monto || !form.fecha}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50">
            {saving ? "Registrando..." : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpensesTable({
  expenses, onEdit, onDelete, deletingId,
}: {
  expenses: CardExpense[];
  onEdit: (e: CardExpense) => void;
  onDelete: (id: number) => void;
  deletingId: number | null;
}) {
  if (expenses.length === 0)
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">No hay gastos en este periodo</p>
      </div>
    );

  return (
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
          {expenses.map((e) => (
            <tr key={e.id}
              className={`border-b border-gray-800 last:border-0 transition ${deletingId === e.id ? "opacity-40" : "hover:bg-gray-800/50"}`}>
              <td className="px-4 py-3 font-medium text-white">{e.descripcion}</td>
              <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{fmtDate(e.fecha)}</td>
              <td className="px-4 py-3 text-right text-white font-semibold">{fmt(e.monto_total)}</td>
              <td className="px-4 py-3 text-right">
                {e.es_msi
                  ? <span className="text-emerald-400 font-medium">{fmt(e.mensualidad)}</span>
                  : <span className="text-gray-500">—</span>}
              </td>
              <td className="px-4 py-3 text-center hidden sm:table-cell">
                {e.es_msi
                  ? <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full">{e.mes_actual}/{e.meses} MSI</span>
                  : <span className="text-gray-600 text-xs">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {e.pagado
                  ? <span className="text-emerald-400 text-xs">✅ Pagado</span>
                  : <span className="text-yellow-400 text-xs">⏳ Pendiente</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1 justify-end">
                  <button onClick={() => onEdit(e)}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition" title="Editar">✏️</button>
                  <button onClick={() => onDelete(e.id)}
                    className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700 transition" title="Eliminar">🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-800/50 text-sm font-semibold">
            <td colSpan={2} className="px-4 py-3 text-gray-400">Total</td>
            <td className="px-4 py-3 text-right text-white">{fmt(expenses.reduce((s, e) => s + Number(e.monto_total), 0))}</td>
            <td className="px-4 py-3 text-right text-emerald-400">{fmt(expenses.reduce((s, e) => s + Number(e.mensualidad), 0))}</td>
            <td colSpan={3} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function CardDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const cardId = Number(params.id);

  const [summary, setSummary] = useState<CardSummary | null>(null);
  const [statements, setStatements] = useState<CardStatement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editExpense, setEditExpense] = useState<(CardExpenseFormData & { id?: number }) | null>(null);
  const [payingStatement, setPayingStatement] = useState<CardStatement | null>(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const reload = useCallback(async () => {
    if (!user || !cardId) return;
    try {
      const [s, stmts] = await Promise.all([
        getCardSummary(cardId),
        getCardStatements(cardId),
      ]);
      setSummary(s);
      setStatements(stmts);
    } catch {
      setError("No se pudo cargar la información de la tarjeta");
    } finally {
      setLoadingData(false);
    }
  }, [user, cardId]);

  useEffect(() => { reload(); }, [reload]);

  const openStatement = statements.find((s) => s.estado === "abierto") ?? null;
  const closedStatement = statements.find((s) => s.estado === "cerrado") ?? null;
  const paidStatements = statements.filter((s) => s.estado === "pagado");

  async function handleCloseStatement() {
    if (!confirm("¿Cerrar el periodo actual? Ya no se podrán agregar gastos a este periodo.")) return;
    setClosing(true);
    try {
      await closeCardStatement(cardId);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cerrar el periodo");
    } finally {
      setClosing(false);
    }
  }

  async function handlePayStatement(data: StatementPayFormData) {
    if (!closedStatement) return;
    setSaving(true);
    try {
      await payCardStatement(cardId, closedStatement.id, data);
      setPayingStatement(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al registrar el pago");
    } finally {
      setSaving(false);
    }
  }

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
      if (id) await updateCardExpense(cardId, id, data);
      else await createCardExpense(cardId, data);
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

  if (loading || loadingData)
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando tarjeta...</p>
      </main>
    );

  if (!summary)
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No se encontró la tarjeta</p>
          <Link href="/cards" className="text-indigo-400 hover:underline">← Volver a tarjetas</Link>
        </div>
      </main>
    );

  const { card } = summary;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Link href="/" className="hover:text-white transition">🏠 Inicio</Link>
            <span>/</span>
            <Link href="/cards" className="hover:text-white transition">💳 Tarjetas</Link>
            <span>/</span>
            <span className="text-white">{card.nombre}</span>
          </div>
          <Link href="/cards"
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition">
            ← Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError("")} className="underline text-xs ml-4">Cerrar</button>
          </div>
        )}

        {/* Header tarjeta */}
        <div className="rounded-2xl p-6 border border-gray-800"
          style={{ background: `linear-gradient(135deg, ${card.color}22, transparent)` }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: card.color }} />
                <h1 className="text-2xl font-bold">{card.nombre}</h1>
              </div>
              <p className="text-gray-400 text-sm">{card.banco}{card.ultimos_4 ? ` ···${card.ultimos_4}` : ""}</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <p>Próximo corte</p>
              <p className="text-white font-medium">{fmtDate(summary.prox_corte)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pago: {fmtDate(summary.prox_pago)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Saldo total", value: fmt(summary.saldo_total), sub: "deuda actual" },
              { label: "Disponible", value: fmt(summary.disponible), sub: `de ${fmt(summary.limite_credito)}` },
              { label: "Gasto mensual", value: fmt(summary.mensualidades_periodo), sub: `de ${fmt(summary.limite_mensual)}` },
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

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Crédito usado</span>
                <span className={pctText(summary.pct_credito)}>{summary.pct_credito}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${pctColor(summary.pct_credito)}`}
                  style={{ width: `${Math.min(summary.pct_credito, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Gasto mensual</span>
                <span className={pctText(summary.pct_mensual)}>{summary.pct_mensual}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${pctColor(summary.pct_mensual)}`}
                  style={{ width: `${Math.min(summary.pct_mensual, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 1: Periodo cerrado pendiente de pago */}
        {closedStatement && (
          <section className="bg-yellow-500/10 border border-yellow-500/40 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-yellow-300">⚠️ Pago pendiente</h2>
                <p className="text-sm text-yellow-400/70 mt-1">
                  Periodo: {fmtDate(closedStatement.inicio)} → {fmtDate(closedStatement.fin)}
                </p>
                <p className="text-xs text-yellow-400/50 mt-0.5">
                  Fecha límite: {fmtDate(closedStatement.fecha_pago_limite)}
                </p>
              </div>
              {/* Dos montos: pago sin intereses vs deuda total */}
              <div className="text-right shrink-0 space-y-1">
                <div>
                  <p className="text-xs text-yellow-400/60 uppercase tracking-wide">
                    Para no generar intereses
                  </p>
                  <p className="text-3xl font-bold text-yellow-300">
                    {fmt(closedStatement.saldo_total)}
                  </p>
                </div>
                {closedStatement.saldo_periodo !== closedStatement.saldo_total && (
                  <div className="border-t border-yellow-500/20 pt-1">
                    <p className="text-xs text-yellow-400/50 uppercase tracking-wide">
                      Saldo total del periodo
                    </p>
                    <p className="text-lg font-semibold text-yellow-400/80">
                      {fmt(closedStatement.saldo_periodo)}
                    </p>
                    <p className="text-xs text-yellow-400/40 mt-0.5">
                      incluye {fmt(closedStatement.mensualidades)} en mensualidades diferidas
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Mini resumen de pago mínimo */}
            {closedStatement.pago_minimo && (
              <p className="text-xs text-yellow-400/50 mb-3">
                Pago mínimo: <span className="font-semibold text-yellow-400/70">{fmt(closedStatement.pago_minimo)}</span>
              </p>
            )}
            <button
              onClick={() => setPayingStatement(closedStatement)}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl transition text-sm">
              💸 Registrar pago de este estado de cuenta
            </button>
          </section>
        )}

        {/* SECCIÓN 2: Periodo abierto actual */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                📄 Periodo actual
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-normal">abierto</span>
              </h2>
              {openStatement && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmtDate(openStatement.inicio)} → {fmtDate(openStatement.fin)}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {openStatement && !closedStatement && (
                <button onClick={handleCloseStatement} disabled={closing}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  {closing ? "Cerrando..." : "🔒 Cerrar periodo"}
                </button>
              )}
              {!closedStatement ? (
                <button onClick={openAddExpense}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  + Agregar gasto
                </button>
              ) : (
                <p className="text-xs text-yellow-400/70">Paga el periodo anterior primero</p>
              )}
            </div>
          </div>

          <ExpensesTable
            expenses={summary.gastos_periodo}
            onEdit={openEditExpense}
            onDelete={handleDeleteExpense}
            deletingId={deletingExpenseId}
          />
        </section>

        {/* SECCIÓN 3: Historial de estados de cuenta pagados */}
        {paidStatements.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">📚 Historial de estados de cuenta</h2>
            <div className="space-y-2">
              {paidStatements.map((stmt) => (
                <div key={stmt.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {fmtDate(stmt.inicio)} → {fmtDate(stmt.fin)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pagado el {stmt.pagado_en ? fmtDate(stmt.pagado_en) : "—"}
                      {stmt.notas_pago ? ` · ${stmt.notas_pago}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{fmt(stmt.monto_pagado ?? "0")}</p>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">✅ pagado</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {showExpenseModal && editExpense && (
        <ExpenseModal
          initial={editExpense}
          onSave={handleSaveExpense}
          onClose={() => setShowExpenseModal(false)}
          saving={saving}
        />
      )}
      {payingStatement && (
        <PayStatementModal
          statement={payingStatement}
          onSave={handlePayStatement}
          onClose={() => setPayingStatement(null)}
          saving={saving}
        />
      )}
    </main>
  );
}
