from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    bio = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=20, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} — {self.role}"


# Crear el perfil automáticamente al crear un User
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


class Item(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="items")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.owner.username})"


class Category(models.Model):
    class CategoryType(models.TextChoices):
        INCOME = "income", "Ingreso"
        EXPENSE = "expense", "Egreso"
        BOTH = "both", "Ambos"

    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default="#6B7280")   # hex color
    icon = models.CharField(max_length=10, default="📌")         # emoji
    type = models.CharField(
        max_length=10,
        choices=CategoryType.choices,
        default=CategoryType.EXPENSE,
    )

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.icon} {self.name}"


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        INCOME = "income", "Ingreso"
        EXPENSE = "expense", "Egreso"

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True, default="")
    date = models.DateField()
    type = models.CharField(
        max_length=10,
        choices=TransactionType.choices,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        sign = "+" if self.type == "income" else "-"
        return f"{sign}${self.amount} — {self.category} ({self.owner.username})"


class CreditCard(models.Model):
    """Tarjeta de crédito del usuario."""
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="credit_cards"
    )
    nombre = models.CharField(max_length=100)          # "BBVA Azul"
    banco = models.CharField(max_length=100, blank=True, default="")
    ultimos_4 = models.CharField(max_length=4, blank=True, default="")
    color = models.CharField(max_length=7, default="#6366F1")  # hex
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2)
    limite_mensual = models.DecimalField(max_digits=12, decimal_places=2)
    corte_dia = models.PositiveSmallIntegerField()     # 1-31
    pago_dia = models.PositiveSmallIntegerField()      # 1-31
    activa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.nombre} ···{self.ultimos_4} ({self.owner.username})"


class CardExpense(models.Model):
    """Gasto cargado a una tarjeta de crédito."""
    card = models.ForeignKey(
        CreditCard, on_delete=models.CASCADE, related_name="expenses"
    )
    descripcion = models.CharField(max_length=255)
    fecha = models.DateField()
    monto_total = models.DecimalField(max_digits=12, decimal_places=2)
    es_msi = models.BooleanField(default=False)
    meses = models.PositiveSmallIntegerField(default=1)   # 1 = una exhibición
    mes_actual = models.PositiveSmallIntegerField(default=1)  # mensualidad en curso
    # mensualidad se calcula: monto_total / meses
    pagado = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-created_at"]

    @property
    def mensualidad(self):
        if self.meses and self.meses > 0:
            return round(self.monto_total / self.meses, 2)
        return self.monto_total

    def __str__(self):
        msi = f" ({self.meses} MSI)" if self.es_msi else ""
        return f"{self.descripcion} ${self.monto_total}{msi} — {self.card.nombre}"


class CardPayment(models.Model):
    """Pago realizado a una tarjeta de crédito."""
    class PaymentType(models.TextChoices):
        MINIMO = "minimo", "Pago mínimo"
        TOTAL = "total", "Pago total"
        PARCIAL = "parcial", "Pago parcial"

    card = models.ForeignKey(
        CreditCard, on_delete=models.CASCADE, related_name="payments"
    )
    fecha = models.DateField()
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    tipo = models.CharField(
        max_length=10, choices=PaymentType.choices, default=PaymentType.TOTAL
    )
    pago_minimo = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    notas = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.card.nombre} — {self.tipo} ${self.monto} ({self.fecha})"


class CardStatement(models.Model):
    """Estado de cuenta de un periodo de una tarjeta de crédito."""

    class StatementStatus(models.TextChoices):
        ABIERTO = "abierto", "Abierto"
        CERRADO = "cerrado", "Cerrado — pendiente de pago"
        PAGADO  = "pagado",  "Pagado"

    card               = models.ForeignKey(
        CreditCard, on_delete=models.CASCADE, related_name="statements"
    )
    inicio             = models.DateField()          # primer día del periodo
    fin                = models.DateField()          # fecha de corte
    fecha_pago_limite  = models.DateField()          # último día para pagar
    saldo_total        = models.DecimalField(        # calculado al cerrar
        max_digits=12, decimal_places=2, default=0
    )
    mensualidades      = models.DecimalField(        # suma de mensualidades MSI
        max_digits=12, decimal_places=2, default=0
    )
    pago_minimo        = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    estado             = models.CharField(
        max_length=10, choices=StatementStatus.choices, default=StatementStatus.ABIERTO
    )
    # Campos del pago (se llenan al pagarlo)
    pagado_en          = models.DateField(null=True, blank=True)
    monto_pagado       = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    notas_pago         = models.CharField(max_length=255, blank=True, default="")
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fin"]
        # Solo un estado de cuenta abierto o cerrado por tarjeta a la vez
        # (los pagados pueden ser muchos)

    def __str__(self):
        return f"{self.card.nombre} | {self.inicio}→{self.fin} [{self.estado}]"


class Budget(models.Model):
    """Presupuesto fijo mensual por categoría y usuario."""
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Un solo presupuesto por usuario+categoría
        unique_together = [("owner", "category")]
        ordering = ["category__name"]

    def __str__(self):
        return f"{self.owner.username} — {self.category} — ${self.amount}"

