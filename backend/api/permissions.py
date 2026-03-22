from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Permite acceso solo a usuarios con role='admin' en su perfil."""

    message = "Se requiere rol de administrador."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role == "admin"
        )


class IsEditorOrAdminRole(BasePermission):
    """Permite acceso a usuarios con role='editor' o 'admin'."""

    message = "Se requiere rol de editor o administrador."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "profile")
            and request.user.profile.role in ("editor", "admin")
        )
