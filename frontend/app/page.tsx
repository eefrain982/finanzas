"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  const [message, setMessage] = useState<string>("");
  const [apiLoading, setApiLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/hello/`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setError("No se pudo conectar con Django."))
      .finally(() => setApiLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 Finanzas</h1>
            <p className="text-gray-500 text-sm mt-1">Control de gastos personales</p>
          </div>
          <div className="flex gap-2 items-center">
            {!authLoading && user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm text-gray-400 hover:text-white px-3 py-2 transition"
                >
                  {user.username}
                  <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                    {user.profile.role}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="text-sm bg-gray-800 text-gray-400 border border-gray-700 px-3 py-2 rounded-lg hover:bg-gray-700 transition"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>

        {/* Estado del servidor */}
        {!apiLoading && !error && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 mb-6 text-center text-sm text-gray-400">
            🟢 {message}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 mb-6 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Cards principales */}
        {!authLoading && user ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard"
              className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 border border-blue-700 rounded-2xl p-6 hover:border-blue-500 transition group"
            >
              <div className="text-4xl mb-3">📊</div>
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition">
                Dashboard
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Resumen del mes, gráficas de gastos e ingresos
              </p>
            </Link>

            <Link
              href="/transactions"
              className="bg-gradient-to-br from-green-900/60 to-green-800/40 border border-green-700 rounded-2xl p-6 hover:border-green-500 transition group"
            >
              <div className="text-4xl mb-3">📋</div>
              <h2 className="text-lg font-semibold text-white group-hover:text-green-300 transition">
                Movimientos
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Ver, filtrar y gestionar ingresos y egresos
              </p>
            </Link>

            <Link
              href="/transactions/new"
              className="bg-gradient-to-br from-purple-900/60 to-purple-800/40 border border-purple-700 rounded-2xl p-6 hover:border-purple-500 transition group"
            >
              <div className="text-4xl mb-3">➕</div>
              <h2 className="text-lg font-semibold text-white group-hover:text-purple-300 transition">
                Nueva transacción
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Registrar ingreso o egreso rápidamente
              </p>
            </Link>

            <Link
              href="/budgets"
              className="bg-gradient-to-br from-yellow-900/60 to-yellow-800/40 border border-yellow-700 rounded-2xl p-6 hover:border-yellow-500 transition group"
            >
              <div className="text-4xl mb-3">🎯</div>
              <h2 className="text-lg font-semibold text-white group-hover:text-yellow-300 transition">
                Presupuestos
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Definir límites de gasto por categoría
              </p>
            </Link>

            <Link
              href="/profile"
              className="bg-gradient-to-br from-gray-800/60 to-gray-700/40 border border-gray-600 rounded-2xl p-6 hover:border-gray-500 transition group"
            >
              <div className="text-4xl mb-3">👤</div>
              <h2 className="text-lg font-semibold text-white group-hover:text-gray-300 transition">
                Mi perfil
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Ver y editar tu información personal
              </p>
            </Link>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-5xl mb-4">💰</p>
            <h2 className="text-xl font-semibold text-white mb-2">
              Controla tus finanzas personales
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Registra ingresos, egresos por categoría y visualiza tu balance mensual
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/login"
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition"
              >
                Registrarse
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
