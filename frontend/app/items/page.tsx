"use client";

import { apiFetch } from "../../lib/api";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";

interface Item {
  id: number;
  title: string;
  description: string;
  owner: string;
  created_at: string;
}

export default function ItemsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Formulario (crear / editar)
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/items/");
      if (!res.ok) throw new Error("Error al cargar items");
      setItems(await res.json());
    } catch {
      setError("No se pudieron cargar los items.");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description);
    setFormError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await apiFetch(
        editing ? `/items/${editing.id}/` : "/items/",
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({ title, description }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }
      setShowForm(false);
      await fetchItems();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este item?")) return;
    await apiFetch(`/items/${id}/`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">Mis Items</h1>
            {user && (
              <p className="text-sm text-gray-400">
                Hola, <span className="font-medium text-gray-600">{user.username}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreate}
              className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              + Nuevo
            </button>
            <button
              onClick={logout}
              className="text-sm border border-gray-200 px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">
              {editing ? "Editar item" : "Nuevo item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Título *"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              {formError && (
                <p className="text-red-500 text-xs">{formError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista */}
        {loading && (
          <p className="text-center text-gray-400 animate-pulse">Cargando...</p>
        )}
        {error && (
          <p className="text-center text-red-500 text-sm">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-4xl mb-3">📋</p>
            <p>No tienes items aún. ¡Crea el primero!</p>
          </div>
        )}
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(item.created_at).toLocaleDateString("es-MX", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="text-xs text-indigo-500 border border-indigo-200 px-3 py-1 rounded-lg hover:bg-indigo-50 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
