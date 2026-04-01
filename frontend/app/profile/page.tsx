"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
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
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Cargando perfil...</p>
      </main>
    );
  }

  if (!user) return null;

  const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
    admin:  { label: "Administrador", color: "text-red-400",    bg: "bg-red-400/10 border border-red-400/30"    },
    editor: { label: "Editor",        color: "text-yellow-400", bg: "bg-yellow-400/10 border border-yellow-400/30" },
    viewer: { label: "Visor",         color: "text-green-400",  bg: "bg-green-400/10 border border-green-400/30"  },
  };
  const role = roleConfig[user.profile.role] ?? {
    label: user.profile.role,
    color: "text-gray-400",
    bg: "bg-gray-700/50 border border-gray-600",
  };

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name} ${user.last_name}`.trim()
      : user.username;

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Link href="/" className="hover:text-white transition">
              🏠 Inicio
            </Link>
            <span>/</span>
            <span className="text-white">Perfil</span>
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

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Tarjeta principal */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-lg">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{user.email || "Sin email registrado"}</p>
              <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${role.bg} ${role.color}`}>
                {role.label}
              </span>
            </div>
          </div>

          {/* Datos */}
          <div className="space-y-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Información de cuenta
            </h2>

            {[
              { label: "Nombre de usuario", value: user.username, icon: "👤" },
              { label: "Correo electrónico", value: user.email || "—", icon: "✉️" },
              { label: "Teléfono",           value: user.profile.phone || "—", icon: "📞" },
              { label: "Rol",                value: role.label, icon: "🔑" },
            ].map(({ label, value, icon }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
              >
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  <span>{icon}</span> {label}
                </span>
                <span className="text-white text-sm font-medium">{value}</span>
              </div>
            ))}

            {/* Bio ocupa su propio bloque si existe */}
            {user.profile.bio && (
              <div className="pt-3">
                <span className="text-gray-400 text-sm flex items-center gap-2 mb-1">
                  <span>📝</span> Bio
                </span>
                <p className="text-white text-sm bg-gray-800 rounded-lg px-4 py-3 leading-relaxed">
                  {user.profile.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-3 rounded-xl font-medium transition text-sm"
          >
            🏠 Ir al inicio
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium transition text-sm"
          >
            📊 Ver dashboard
          </Link>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl py-3 text-sm font-medium transition"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </main>
  );
}
