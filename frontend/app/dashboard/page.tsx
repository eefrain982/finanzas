"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { getSummary } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Summary } from "@/types/finance";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError("");
    getSummary(month, year)
      .then(setSummary)
      .catch(() => setError("No se pudo cargar el resumen"))
      .finally(() => setLoading(false));
  }, [user, month, year]);

  if (authLoading || !user) return null;

  // ─── datos para gráfica dona (egresos por categoría) ────────────────────
  const expenseCategories = summary?.by_category.filter((c) => c.type === "expense") ?? [];
  const doughnutData = {
    labels: expenseCategories.map((c) => `${c.icon} ${c.category}`),
    datasets: [
      {
        data: expenseCategories.map((c) => c.total),
        backgroundColor: expenseCategories.map((c) => c.color),
        borderWidth: 2,
        borderColor: "#1f2937",
      },
    ],
  };

  // ─── datos para gráfica barras (tendencia 6 meses) ──────────────────────
  const trend = summary?.monthly_trend ?? [];
  const barData = {
    labels: trend.map((m) => m.label),
    datasets: [
      {
        label: "Ingresos",
        data: trend.map((m) => m.income),
        backgroundColor: "#22c55e",
        borderRadius: 6,
      },
      {
        label: "Egresos",
        data: trend.map((m) => m.expense),
        backgroundColor: "#ef4444",
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#d1d5db" } },
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#374151" } },
      y: {
        ticks: {
          color: "#9ca3af",
          callback: (v: number | string) =>
            `$${Number(v).toLocaleString("es-MX")}`,
        },
        grid: { color: "#374151" },
      },
    },
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 Dashboard</h1>
            <p className="text-gray-400 mt-1">Control de gastos personales</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/transactions/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              + Nueva transacción
            </Link>
            <Link
              href="/transactions"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Ver movimientos
            </Link>
            <Link href="/" className="text-gray-400 hover:text-white px-3 py-2 transition">
              ← Inicio
            </Link>
          </div>
        </div>

        {/* Selector mes/año */}
        <div className="flex gap-4 mb-8">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400 text-lg">Cargando...</div>
        ) : (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Ingresos del mes</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatMXN(summary?.total_income ?? 0)}
                </p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <p className="text-gray-400 text-sm mb-1">Egresos del mes</p>
                <p className="text-3xl font-bold text-red-400">
                  {formatMXN(summary?.total_expense ?? 0)}
                </p>
              </div>
              <div
                className={`rounded-2xl p-6 border ${
                  (summary?.balance ?? 0) >= 0
                    ? "bg-green-900/30 border-green-700"
                    : "bg-red-900/30 border-red-700"
                }`}
              >
                <p className="text-gray-400 text-sm mb-1">Balance</p>
                <p
                  className={`text-3xl font-bold ${
                    (summary?.balance ?? 0) >= 0 ? "text-green-300" : "text-red-300"
                  }`}
                >
                  {formatMXN(summary?.balance ?? 0)}
                </p>
              </div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Dona — gastos por categoría */}
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">
                  🍩 Egresos por categoría
                </h2>
                {expenseCategories.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">
                    Sin egresos este mes
                  </p>
                ) : (
                  <Doughnut
                    data={doughnutData}
                    options={{
                      plugins: {
                        legend: { labels: { color: "#d1d5db" } },
                      },
                    }}
                  />
                )}
              </div>

              {/* Barras — tendencia 6 meses */}
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gray-200 mb-4">
                  📊 Últimos 6 meses
                </h2>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Tabla desglose por categoría */}
            {expenseCategories.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-200">
                    📋 Desglose de egresos
                  </h2>
                  <a
                    href="/budgets"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Configurar presupuestos →
                  </a>
                </div>
                <div className="space-y-4">
                  {expenseCategories.map((cat) => {
                    const pctOfTotal =
                      summary && summary.total_expense > 0
                        ? (cat.total / summary.total_expense) * 100
                        : 0;
                    const pctOfBudget = cat.pct_used;
                    const overBudget =
                      pctOfBudget !== null && pctOfBudget > 100;
                    return (
                      <div key={cat.category_id}>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xl w-8">{cat.icon}</span>
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="text-gray-300 text-sm">
                                {cat.category}
                              </span>
                              <div className="text-right">
                                <span
                                  className={`text-sm font-medium ${
                                    overBudget ? "text-red-400" : "text-gray-300"
                                  }`}
                                >
                                  {formatMXN(cat.total)}
                                </span>
                                {cat.budget !== null && (
                                  <span className="text-gray-500 text-xs ml-1">
                                    / {formatMXN(cat.budget)}
                                    {overBudget && " ⚠️"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Barra de presupuesto (si existe) o de proporción */}
                        <div className="ml-11">
                          {cat.budget !== null ? (
                            <div>
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    overBudget ? "bg-red-500" : ""
                                  }`}
                                  style={{
                                    width: `${Math.min(pctOfBudget ?? 0, 100)}%`,
                                    backgroundColor: overBudget
                                      ? undefined
                                      : cat.color,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {pctOfBudget?.toFixed(1)}% del presupuesto usado
                              </p>
                            </div>
                          ) : (
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pctOfTotal}%`,
                                  backgroundColor: cat.color,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
