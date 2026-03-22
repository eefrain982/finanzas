import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <p className="text-5xl mb-4">🚫</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso denegado</h1>
        <p className="text-gray-500 mb-6">
          No tienes permisos para ver esta página.
        </p>
        <Link
          href="/"
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
