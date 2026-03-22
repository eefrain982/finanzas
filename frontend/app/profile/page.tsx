"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando perfil...</p>
      </main>
    );
  }

  if (!user) return null;

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    editor: "bg-yellow-100 text-yellow-700",
    viewer: "bg-green-100 text-green-700",
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-8">
        {/* Avatar y nombre */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {user.first_name || user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : user.username}
            </h1>
            <p className="text-sm text-gray-500">{user.email || "Sin email"}</p>
          </div>
          <span
            className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${
              roleColors[user.profile.role] || "bg-gray-100 text-gray-600"
            }`}
          >
            {user.profile.role}
          </span>
        </div>

        {/* Datos del perfil */}
        <div className="space-y-3 text-sm text-gray-700 border-t pt-4">
          <div className="flex justify-between">
            <span className="font-medium text-gray-500">Usuario</span>
            <span>{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-500">Teléfono</span>
            <span>{user.profile.phone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-500">Bio</span>
            <span className="text-right max-w-xs">{user.profile.bio || "—"}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-6 w-full border border-red-300 text-red-500 rounded-lg py-2 text-sm font-medium hover:bg-red-50 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
