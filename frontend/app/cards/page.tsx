"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../hooks/useAuth";
import {
  getCards,
  getCardSummary,
  createCard,
  updateCard,
  deleteCard,
} from "../../lib/api";
import type { CreditCard, CardSummary, CreditCardFormData } from "../../types/finance";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function pctColor(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-emerald-500";
}

function pctTextColor(pct: number) {
  if (pct >= 90) return "text-red-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-emerald-400";
}

const CARD_COLORS = [
  "#6366F1", "#0066FF", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6",
];

const EMPTY_FORM: CreditCardFormData = {
  nombre: "",
  banco: "",
  ultimos_4: "",
  color: "#6366F1",
  limite_credito: "",
  limite_mensual: "",
  corte_dia: 1,
  pago_dia: 1,
};

// ─── Subcomponente: tarjeta individual con su summary ───────────────────────

function CardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: CreditCard;
  onEdit: (card: CreditCard) => void;
  onDelete: (id: number) => void;
}) {
  const [summary, setSummary] = useState<CardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    getCardSummary(card.id)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [card.id]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header con color de la tarjeta */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: card.color }}
      />

      <div className="p-6">
        {/* Nombre y últimos 4 */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: card.color }}
              />
              {card.nombre}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {card.banco}{card.ultimos_4 ? ` ···${card.ultimos_4}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(card)}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition text-sm"
              title="Editar tarjeta"
            >✏️</button>
            <button
              onClick={() => onDelete(card.id)}
              className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition text-sm"
              title="Eliminar tarjeta"
            >🗑️</button>
          </div>
        </div>

        {loadingSummary ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 bg-gray-800 rounded" />
            <div className="h-3 bg-gray-800 rounded w-3/4" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Barra crédito */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Crédito usado</span>
                <span className={`font-medium ${pctTextColor(summary.pct_credito)}`}>
                  {fmt(summary.saldo_total)} / {fmt(summary.limite_credito)}
                  <span className="ml-1 text-gray-500">({summary.pct_credito}%)</span>
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${pctColor(summary.pct_credito)}`}
                  style={{ width: `${Math.min(summary.pct_credito, 100)}%` }}
                />
              </div>
            </div>

            {/* Barra mensual */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Gasto mensual</span>
                <span className={`font-medium ${pctTextColor(summary.pct_mensual)}`}>
                  {fmt(summary.mensualidades_periodo)} / {fmt(summary.limite_mensual)}
                  <span className="ml-1 text-gray-500">({summary.pct_mensual}%)</span>
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${pctColor(summary.pct_mensual)}`}
                  style={{ width: `${Math.min(summary.pct_mensual, 100)}%` }}
                />
              </div>
            </div>

            {/* Fechas + disponible */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Disponible</p>
                <p className="text-white font-semibold text-sm">{fmt(summary.disponible)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Corte en</p>
                <p className="text-white font-semibold text-sm">
                  {summary.dias_para_corte === 0
                    ? "Hoy"
                    : `${summary.dias_para_corte} día${summary.dias_para_corte !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Fecha corte</p>
                <p className="text-white font-semibold text-sm">
                  {new Date(summary.prox_corte + "T12:00:00").toLocaleDateString("es-MX", {
                    day: "numeric", month: "short",
                  })}
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Pago límite</p>
                <p className="text-white font-semibold text-sm">
                  {new Date(summary.prox_pago + "T12:00:00").toLocaleDateString("es-MX", {
                    day: "numeric", month: "short",
                  })}
                </p>
              </div>
            </div>

            {/* Alerta si supera el 80% */}
            {(summary.pct_credito >= 80 || summary.pct_mensual >= 80) && (
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
                ⚠️{" "}
                {summary.pct_credito >= 80 && summary.pct_mensual >= 80
                  ? "Límite de crédito y mensual al límite"
                  : summary.pct_credito >= 80
                  ? "Cerca del tope de crédito"
                  : "Cerca del límite mensual"}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No se pudo cargar el resumen</p>
        )}

        {/* Botón ver detalle */}
        <Link
          href={`/cards/${card.id}`}
          className="mt-5 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition"
        >
          Ver detalle y gastos →
        </Link>
      </div>
    </div>
  );
}

// ─── Modal crear / editar tarjeta ────────────────────────────────────────────

function CardModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: CreditCardFormData & { id?: number };
  onSave: (data: CreditCardFormData, id?: number) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreditCardFormData>({
    nombre: initial.nombre,
    banco: initial.banco,
    ultimos_4: initial.ultimos_4,
    color: initial.color,
    limite_credito: initial.limite_credito,
    limite_mensual: initial.limite_mensual,
    corte_dia: initial.corte_dia,
    pago_dia: initial.pago_dia,
  });

  function set(field: keyof CreditCardFormData, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">
          {initial.id ? "✏️ Editar tarjeta" : "➕ Nueva tarjeta"}
        </h2>

        {/* Nombre y banco */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="BBVA Azul"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Banco</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="BBVA"
              value={form.banco}
              onChange={(e) => set("banco", e.target.value)}
            />
          </div>
        </div>

        {/* Últimos 4 y color */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Últimos 4 dígitos</label>
            <input
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="1234"
              maxLength={4}
              value={form.ultimos_4}
              onChange={(e) => set("ultimos_4", e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Color</label>
            <div className="flex gap-2 flex-wrap pt-1">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    form.color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Límites */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tope de crédito *</label>
            <input
              type="number"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="30000"
              value={form.limite_credito}
              onChange={(e) => set("limite_credito", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Límite mensual *</label>
            <input
              type="number"
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              placeholder="8000"
              value={form.limite_mensual}
              onChange={(e) => set("limite_mensual", e.target.value)}
            />
          </div>
        </div>

        {/* Días de corte y pago */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Día de corte *</label>
            <input
              type="number"
              min={1} max={31}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.corte_dia}
              onChange={(e) => set("corte_dia", parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Día límite de pago *</label>
            <input
              type="number"
              min={1} max={31}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={form.pago_dia}
              onChange={(e) => set("pago_dia", parseInt(e.target.value) || 1)}
            />
          </div>
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
            onClick={() => onSave(form, initial.id)}
            disabled={saving || !form.nombre || !form.limite_credito || !form.limite_mensual}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function CardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState<(CreditCardFormData & { id?: number }) | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    getCards()
      .then(setCards)
      .catch(() => setError("No se pudieron cargar las tarjetas"))
      .finally(() => setLoadingCards(false));
  }, [user]);

  function openCreate() {
    setEditCard({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(card: CreditCard) {
    setEditCard({
      id: card.id,
      nombre: card.nombre,
      banco: card.banco,
      ultimos_4: card.ultimos_4,
      color: card.color,
      limite_credito: card.limite_credito,
      limite_mensual: card.limite_mensual,
      corte_dia: card.corte_dia,
      pago_dia: card.pago_dia,
    });
    setShowModal(true);
  }

  async function handleSave(data: CreditCardFormData, id?: number) {
    setSaving(true);
    try {
      if (id) {
        const updated = await updateCard(id, data);
        setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } else {
        const created = await createCard(data);
        setCards((prev) => [...prev, created]);
      }
      setShowModal(false);
    } catch {
      setError("Error al guardar la tarjeta");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta tarjeta y todos sus gastos?")) return;
    setDeletingId(id);
    try {
      await deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Error al eliminar la tarjeta");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading || loadingCards) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando tarjetas...</p>
      </main>
    );
  }

  const activeCards = cards.filter((c) => c.activa);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Link href="/" className="hover:text-white transition">🏠 Inicio</Link>
            <span>/</span>
            <span className="text-white">Tarjetas</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/transactions"
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition"
            >
              📋 Movimientos
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">💳 Tarjetas de Crédito</h1>
            <p className="text-gray-400 mt-1">
              {activeCards.length} tarjeta{activeCards.length !== 1 ? "s" : ""} activa{activeCards.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            + Nueva tarjeta
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Lista de tarjetas */}
        {activeCards.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">💳</p>
            <p className="text-gray-400 text-lg mb-2">No tienes tarjetas registradas</p>
            <p className="text-gray-600 text-sm mb-6">Agrega tu primera tarjeta para empezar a controlar tus gastos</p>
            <button
              onClick={openCreate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition"
            >
              + Agregar tarjeta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeCards.map((card) => (
              <div key={card.id} className={deletingId === card.id ? "opacity-50 pointer-events-none" : ""}>
                <CardItem
                  card={card}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editCard && (
        <CardModal
          initial={editCard}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </main>
  );
}
