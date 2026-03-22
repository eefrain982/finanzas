from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    # Públicos
    path('hello/', views.hello, name='hello'),
    # Auth
    path('auth/register/', views.register, name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Perfil (requiere token)
    path('profile/', views.profile, name='profile'),
    # Items CRUD (requiere token)
    path('items/', views.items_list, name='items-list'),
    path('items/<int:pk>/', views.item_detail, name='item-detail'),
    # Admin (requiere rol admin)
    path('admin/items/', views.admin_items_list, name='admin-items'),
    path('admin/users/', views.admin_users_list, name='admin-users'),
]
