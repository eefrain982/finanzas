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
    # Finanzas
    path('finance/categories/', views.categories_list, name='finance-categories'),
    path('finance/transactions/', views.transactions_list, name='finance-transactions'),
    path('finance/transactions/export/', views.transactions_export, name='finance-transactions-export'),
    path('finance/transactions/<int:pk>/', views.transaction_detail, name='finance-transaction-detail'),
    path('finance/transactions/<int:pk>/duplicate/', views.transaction_duplicate, name='finance-transaction-duplicate'),
    path('finance/summary/', views.summary, name='finance-summary'),
    # Presupuestos
    path('finance/budgets/', views.budgets_list, name='finance-budgets'),
    path('finance/budgets/<int:category_id>/', views.budget_detail, name='finance-budget-detail'),
    # Tarjetas de crédito
    path('finance/cards/', views.cards_list, name='finance-cards'),
    path('finance/cards/<int:pk>/', views.card_detail, name='finance-card-detail'),
    path('finance/cards/<int:pk>/expenses/', views.card_expenses, name='finance-card-expenses'),
    path('finance/cards/<int:pk>/expenses/<int:expense_id>/', views.card_expense_detail, name='finance-card-expense-detail'),
    path('finance/cards/<int:pk>/payments/', views.card_payments, name='finance-card-payments'),
    path('finance/cards/<int:pk>/payments/<int:payment_id>/', views.card_payment_detail, name='finance-card-payment-detail'),
    path('finance/cards/<int:pk>/summary/', views.card_summary, name='finance-card-summary'),
]
