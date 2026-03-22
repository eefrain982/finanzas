from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import Item, Profile


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "Perfil extendido"
    fields = ["role", "bio", "phone", "avatar_url"]


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ["username", "email", "first_name", "last_name", "get_role", "is_staff"]

    @admin.display(description="Rol")
    def get_role(self, obj):
        return obj.profile.get_role_display()


admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "created_at", "updated_at"]
    list_filter = ["owner"]
    search_fields = ["title", "description"]
    readonly_fields = ["created_at", "updated_at"]


