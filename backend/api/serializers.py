from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Budget, CardExpense, CardPayment, CardStatement, CreditCard, Category, Item, Profile, Transaction


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["role", "bio", "phone", "avatar_url", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer que expone User + Profile anidado en un solo objeto."""

    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "date_joined",
            "profile",
        ]
        read_only_fields = ["id", "is_active", "date_joined"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class ItemSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Item
        fields = ["id", "title", "description", "owner", "created_at", "updated_at"]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "icon", "color", "type"]


class TransactionSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")
    category_detail = CategorySerializer(source="category", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "amount",
            "description",
            "date",
            "type",
            "category",
            "category_detail",
            "owner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "category_detail", "created_at", "updated_at"]


class BudgetSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Budget
        fields = ["id", "category", "category_detail", "owner", "amount", "updated_at"]
        read_only_fields = ["id", "owner", "category_detail", "updated_at"]


class CreditCardSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = CreditCard
        fields = [
            "id", "owner", "nombre", "banco", "ultimos_4", "color",
            "limite_credito", "limite_mensual", "corte_dia", "pago_dia",
            "activa", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class CardExpenseSerializer(serializers.ModelSerializer):
    mensualidad = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = CardExpense
        fields = [
            "id", "card", "descripcion", "fecha", "monto_total",
            "es_msi", "meses", "mes_actual", "mensualidad", "pagado", "created_at",
        ]
        read_only_fields = ["id", "mensualidad", "created_at"]


class CardPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardPayment
        fields = [
            "id", "card", "fecha", "monto", "tipo", "pago_minimo",
            "notas", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CardStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardStatement
        fields = [
            "id", "card", "inicio", "fin", "fecha_pago_limite",
            "saldo_total", "mensualidades", "pago_minimo", "estado",
            "pagado_en", "monto_pagado", "notas_pago",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "saldo_total", "mensualidades", "estado",
            "created_at", "updated_at",
        ]


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["role", "bio", "phone", "avatar_url", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer que expone User + Profile anidado en un solo objeto."""

    profile = ProfileSerializer()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "date_joined",
            "profile",
        ]
        read_only_fields = ["id", "is_active", "date_joined"]

    def update(self, instance, validated_data):
        # Extraer datos del perfil anidado
        profile_data = validated_data.pop("profile", {})

        # Actualizar campos del User
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Actualizar campos del Profile
        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()

        return instance
