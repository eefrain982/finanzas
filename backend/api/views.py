from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Item
from .permissions import IsAdminRole
from .serializers import ItemSerializer, UserProfileSerializer


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
