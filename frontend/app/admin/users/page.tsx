"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useRequireRole } from "../../../hooks/useRequireRole";
import Link from "next/link";

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  profile: {
    role: string;
    bio: string;
    phone: string;
  };
}

const roleBadge: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  editor: "bg-yellow-100 text-yellow-700",
  viewer: "bg-green-100 text-green-700",
};

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useRequireRole(["admin"]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/admin/users/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setUsers)
      .catch(() => setError("No se pudieron cargar los usuarios."))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || (!user && !error)) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-red-600">Usuarios</h1>
            <p className="text-sm text-gray-400">Todos los usuarios registrados</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/items"
              className="text-sm border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition"
            >
              Ver items
            </Link>
            <Link
              href="/"
              className="text-sm border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              ← Inicio
            </Link>
          </div>
        </div>

        {loading && (
          <p className="text-center text-gray-400 animate-pulse">Cargando...</p>
        )}
        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{u.username}</p>
                <p className="text-xs text-gray-400">{u.email || "Sin email"}</p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  roleBadge[u.profile.role] || "bg-gray-100 text-gray-600"
                }`}
              >
                {u.profile.role}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  u.is_active
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {u.is_active ? "activo" : "inactivo"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
