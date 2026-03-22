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
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-md p-8">

        {/* Header dinámico según sesión */}
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-indigo-600">Django + Next.js</h1>
          <div className="flex gap-2">
            {!authLoading && user ? (
              // Usuario logueado
              <>
                <Link
                  href="/items"
                  className="text-sm border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  Mis Items
                </Link>
                {user.profile.role === "admin" && (
                  <Link
                    href="/admin/items"
                    className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  {user.username}
                </Link>
                <button
                  onClick={logout}
                  className="text-sm bg-red-50 text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition"
                >
                  Salir
                </button>
              </>
            ) : (
              // Sin sesión
              <>
                <Link
                  href="/items"
                  className="text-sm border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  Mis Items
                </Link>
                <Link
                  href="/login"
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-gray-500 mb-8">Proyecto fullstack simple</p>

        {/* Bienvenida personalizada */}
        {!authLoading && user && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4 text-sm text-green-700">
            👋 Bienvenido de nuevo, <span className="font-semibold">{user.username}</span>
            {' '}— rol: <span className="font-semibold">{user.profile.role}</span>
          </div>
        )}

        {/* Estado del servidor */}
        {apiLoading && (
          <p className="text-center text-gray-400 animate-pulse">
            Conectando con el servidor...
          </p>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm text-center">
            {error}
          </div>
        )}
        {!apiLoading && !error && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-center">
            <p className="text-indigo-700 font-medium">Servidor Django:</p>
            <p className="text-indigo-500 text-lg">{message}</p>
          </div>
        )}

        {/* Cards de navegación */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-gray-500 border-t pt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">
              {user ? "Gestionar Items" : "¿Primera vez?"}
            </p>
            <p>
              {user
                ? "Crea, edita y elimina tus items."
                : "Regístrate o inicia sesión para gestionar tus items."}
            </p>
            <Link
              href={user ? "/items" : "/login"}
              className="text-indigo-500 hover:underline mt-2 inline-block"
            >
              {user ? "Ver items →" : "Ir al login →"}
            </Link>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-1">Mi Perfil</p>
            <p>
              {user
                ? "Consulta y edita tu información."
                : "Inicia sesión para ver tu perfil."}
            </p>
            <Link
              href={user ? "/profile" : "/login"}
              className="text-indigo-500 hover:underline mt-2 inline-block"
            >
              {user ? "Ver perfil →" : "Iniciar sesión →"}
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}
