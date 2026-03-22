from django.contrib.auth.models import User
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Budget, Category, Item, Transaction
from .permissions import IsAdminRole
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    ItemSerializer,
    TransactionSerializer,
    UserProfileSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def hello(request):
    return Response({"message": "¡Hola desde Django!"})


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/ → crea usuario y devuelve tokens."""
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')

    if not username or not password:
        return Response({'error': 'username y password son requeridos.'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'El usuario ya existe.'}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(user).data,
    }, status=201)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    """
    GET /api/profile/ → devuelve el perfil del usuario autenticado
    PUT /api/profile/ → actualiza user + profile en un solo request
    """
    if request.method == 'GET':
        return Response(UserProfileSerializer(request.user).data)

    serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def items_list(request):
    """
    GET  /api/items/ → lista los items del usuario autenticado
    POST /api/items/ → crea un nuevo item
    """
    if request.method == 'GET':
        items = Item.objects.filter(owner=request.user)
        return Response(ItemSerializer(items, many=True).data)

    serializer = ItemSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(owner=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def item_detail(request, pk):
    """
    GET    /api/items/:id/ → obtiene un item
    PUT    /api/items/:id/ → actualiza un item (solo owner)
    DELETE /api/items/:id/ → elimina un item (solo owner)
    """
    item = get_object_or_404(Item, pk=pk)

    if request.method in ['PUT', 'DELETE'] and item.owner != request.user:
        return Response({'error': 'No tienes permiso para esta acción.'}, status=403)

    if request.method == 'GET':
        return Response(ItemSerializer(item).data)

    if request.method == 'PUT':
        serializer = ItemSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    item.delete()
    return Response(status=204)


@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_items_list(request):
    """
    GET /api/admin/items/ → solo admin: lista TODOS los items de TODOS los usuarios.
    Incluye información del owner en cada item.
    """
    items = Item.objects.select_related('owner').all()
    data = [
        {
            **ItemSerializer(item).data,
            'owner_email': item.owner.email,
            'owner_role': item.owner.profile.role,
        }
        for item in items
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_users_list(request):
    """
    GET /api/admin/users/ → solo admin: lista todos los usuarios con su perfil.
    """
    users = User.objects.select_related('profile').all()
    return Response(UserProfileSerializer(users, many=True).data)


# ─── Finanzas ────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def categories_list(request):
    """GET /api/finance/categories/ → lista todas las categorías disponibles."""
    categories = Category.objects.all()
    return Response(CategorySerializer(categories, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def transactions_list(request):
    """
    GET  /api/finance/transactions/?month=3&year=2026&type=expense&category=1
    POST /api/finance/transactions/
    """
    if request.method == 'GET':
        qs = Transaction.objects.filter(owner=request.user).select_related('category')

        # Filtro mes/año (por defecto mes actual)
        from datetime import date
        today = date.today()
        month = int(request.GET.get('month', today.month))
        year  = int(request.GET.get('year',  today.year))
        qs = qs.filter(date__month=month, date__year=year)

        # Filtros opcionales
        tx_type = request.GET.get('type')
        if tx_type in ('income', 'expense'):
            qs = qs.filter(type=tx_type)

        category_id = request.GET.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        return Response(TransactionSerializer(qs, many=True).data)

    # POST — crear transacción
    serializer = TransactionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(owner=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def transaction_detail(request, pk):
    """
    GET    /api/finance/transactions/:id/
    PUT    /api/finance/transactions/:id/
    DELETE /api/finance/transactions/:id/
    """
    tx = get_object_or_404(Transaction, pk=pk)

    if tx.owner != request.user:
        return Response({'error': 'No tienes permiso para esta acción.'}, status=403)

    if request.method == 'GET':
        return Response(TransactionSerializer(tx).data)

    if request.method == 'PUT':
        serializer = TransactionSerializer(tx, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    tx.delete()
    return Response(status=204)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transaction_duplicate(request, pk):
    """
    POST /api/finance/transactions/:id/duplicate/
    Clona la transacción con la fecha de hoy y la devuelve.
    """
    from datetime import date
    tx = get_object_or_404(Transaction, pk=pk)
    if tx.owner != request.user:
        return Response({'error': 'No tienes permiso para esta acción.'}, status=403)

    new_tx = Transaction.objects.create(
        amount=tx.amount,
        description=tx.description,
        date=date.today(),
        type=tx.type,
        category=tx.category,
        owner=request.user,
    )
    return Response(TransactionSerializer(new_tx).data, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary(request):
    """
    GET /api/finance/summary/?month=3&year=2026

    Retorna:
    - total_income     : suma de ingresos del mes
    - total_expense    : suma de egresos del mes
    - balance          : total_income - total_expense
    - by_category      : lista [{category, total, type, color, icon}]
    - monthly_trend    : últimos 6 meses [{month, year, income, expense}]
    """
    from datetime import date
    from dateutil.relativedelta import relativedelta

    today = date.today()
    month = int(request.GET.get('month', today.month))
    year  = int(request.GET.get('year',  today.year))

    base_qs = Transaction.objects.filter(
        owner=request.user,
        date__month=month,
        date__year=year,
    )

    total_income  = base_qs.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0
    total_expense = base_qs.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0
    balance = total_income - total_expense

    # Desglose por categoría + presupuesto
    from django.db.models import Sum as DSum
    by_cat_qs = (
        base_qs
        .values('category__id', 'category__name', 'category__color', 'category__icon', 'type')
        .annotate(total=DSum('amount'))
        .order_by('-total')
    )

    # Mapa de presupuestos del usuario: {category_id: amount}
    budget_map = {
        b.category_id: float(b.amount)
        for b in Budget.objects.filter(owner=request.user)
    }

    by_category = []
    for row in by_cat_qs:
        cat_id = row['category__id']
        total  = float(row['total'])
        budget = budget_map.get(cat_id)
        by_category.append({
            'category_id': cat_id,
            'category':    row['category__name'] or 'Sin categoría',
            'color':       row['category__color'] or '#6B7280',
            'icon':        row['category__icon']  or '📌',
            'type':        row['type'],
            'total':       total,
            'budget':      budget,
            'pct_used':    round((total / budget * 100), 1) if budget else None,
        })

    # Tendencia últimos 6 meses
    monthly_trend = []
    ref = date(year, month, 1)
    for i in range(5, -1, -1):
        d = ref - relativedelta(months=i)
        qs_m = Transaction.objects.filter(
            owner=request.user,
            date__month=d.month,
            date__year=d.year,
        )
        monthly_trend.append({
            'month': d.month,
            'year':  d.year,
            'label': d.strftime('%b %Y'),
            'income':  float(qs_m.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0),
            'expense': float(qs_m.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0),
        })

    return Response({
        'month':         month,
        'year':          year,
        'total_income':  float(total_income),
        'total_expense': float(total_expense),
        'balance':       float(balance),
        'by_category':   by_category,
        'monthly_trend': monthly_trend,
    })


# ─── Presupuestos ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budgets_list(request):
    """
    GET /api/finance/budgets/
    Devuelve todas las categorías de tipo expense/both,
    con el presupuesto del usuario si existe (o null).
    """
    categories = Category.objects.filter(type__in=['expense', 'both'])
    budget_map = {
        b.category_id: b
        for b in Budget.objects.filter(owner=request.user)
    }
    data = []
    for cat in categories:
        budget = budget_map.get(cat.id)
        data.append({
            'category_id':   cat.id,
            'category_name': cat.name,
            'icon':          cat.icon,
            'color':         cat.color,
            'budget_id':     budget.id if budget else None,
            'amount':        float(budget.amount) if budget else None,
        })
    return Response(data)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def budget_detail(request, category_id):
    """
    PUT    /api/finance/budgets/:category_id/ → crea o actualiza presupuesto
    DELETE /api/finance/budgets/:category_id/ → elimina presupuesto
    """
    category = get_object_or_404(Category, pk=category_id)

    if request.method == 'DELETE':
        Budget.objects.filter(owner=request.user, category=category).delete()
        return Response(status=204)

    # PUT: upsert
    amount = request.data.get('amount')
    if not amount:
        return Response({'error': 'amount es requerido.'}, status=400)
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'amount debe ser un número positivo.'}, status=400)

    budget, created = Budget.objects.update_or_create(
        owner=request.user,
        category=category,
        defaults={'amount': amount},
    )
    serializer = BudgetSerializer(budget)
    return Response(serializer.data, status=201 if created else 200)
