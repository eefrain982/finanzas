"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./useAuth";

type Role = "admin" | "editor" | "viewer";

/**
 * Protege una página por rol.
 * Si el usuario no está autenticado → redirige a /login
 * Si está autenticado pero no tiene el rol requerido → redirige a /unauthorized
 */
export function useRequireRole(allowedRoles: Role[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!allowedRoles.includes(user.profile.role as Role)) {
      router.push("/unauthorized");
    }
  }, [user, loading, router, allowedRoles]);

  return { user, loading };
}
