"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useRequireRole } from "../../../hooks/useRequireRole";
import Link from "next/link";

interface AdminItem {
  id: number;
  title: string;
  description: string;
  owner: string;
  owner_email: string;
  owner_role: string;
  created_at: string;
}

const roleBadge: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  editor: "bg-yellow-100 text-yellow-700",
  viewer: "bg-green-100 text-green-700",
};

export default function AdminItemsPage() {
  const { user, loading: authLoading } = useRequireRole(["admin"]);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/admin/items/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setItems)
      .catch(() => setError("No se pudieron cargar los items."))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || (!user && !error)) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-red-600">Panel Admin</h1>
            <p className="text-sm text-gray-400">
              Todos los items del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/users"
              className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
            >
              Ver usuarios
            </Link>
            <Link
              href="/"
              className="text-sm border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              ← Inicio
            </Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">Total items</span>
              <p className="text-2xl font-bold text-gray-800">{items.length}</p>
            </div>
            <div>
              <span className="text-gray-400">Usuarios únicos</span>
              <p className="text-2xl font-bold text-gray-800">
                {new Set(items.map((i) => i.owner)).size}
              </p>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading && (
          <p className="text-center text-gray-400 animate-pulse">Cargando...</p>
        )}
        {error && (
          <p className="text-center text-red-500 text-sm">{error}</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-gray-400 py-12">No hay items en el sistema.</p>
        )}

        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                    roleBadge[item.owner_role] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {item.owner_role}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 border-t pt-2">
                <span>👤 <span className="font-medium text-gray-600">{item.owner}</span></span>
                {item.owner_email && <span>✉️ {item.owner_email}</span>}
                <span className="ml-auto">
                  {new Date(item.created_at).toLocaleDateString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
