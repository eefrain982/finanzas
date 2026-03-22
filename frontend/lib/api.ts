const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

/** Intenta renovar el access token usando el refresh token guardado.
 *  Devuelve el nuevo access token, o null si no se pudo renovar. */
async function refreshAccessToken(): Promise<string | null> {
  const refresh =
    typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

  if (!refresh) return null;

  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    // Refresh expirado → limpiar sesión
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    return null;
  }

  const data = await res.json();
  localStorage.setItem("access_token", data.access);
  // simplejwt con ROTATE_REFRESH_TOKENS devuelve un nuevo refresh también
  if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
  return data.access;
}

/** Helper principal. Reintenta automáticamente con token renovado si recibe 401. */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(token, options.headers),
  });

  // Si el token expiró, intentamos renovarlo y reintentamos una vez
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: buildHeaders(newToken, options.headers),
      });
    }
  }

  return res;
}
