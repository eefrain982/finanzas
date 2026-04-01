"""
seed.py — Recrea datos de prueba para el módulo de tarjetas de crédito.

Uso dentro del contenedor:
    python manage.py shell < seed.py

O desde el host:
    docker exec -i personal_backend_1 python manage.py shell < seed.py
"""

import datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from django.contrib.auth.models import User
from api.models import CreditCard, CardExpense, CardStatement

# ─── Config ───────────────────────────────────────────────────────────────────

USERNAME = "admin"
RESET_CARDS = True   # True = borra todas las tarjetas del usuario antes de crear

# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_period(corte_dia, pago_dia, ref_date):
    """Devuelve (inicio, fin, fecha_pago_limite) para el periodo que contiene ref_date."""
    if ref_date.day <= corte_dia:
        fin   = ref_date.replace(day=corte_dia)
        inicio = (fin - relativedelta(months=1)).replace(day=corte_dia + 1) \
                  if corte_dia < 28 else \
                  (fin.replace(day=1) - relativedelta(months=1)).replace(day=corte_dia + 1)
    else:
        inicio = ref_date.replace(day=corte_dia + 1)
        fin    = (ref_date + relativedelta(months=1)).replace(day=corte_dia)

    if fin.day < pago_dia:
        fpl = fin.replace(day=pago_dia)
    else:
        fpl = (fin + relativedelta(months=1)).replace(day=pago_dia)

    return inicio, fin, fpl


def period_start(corte_dia, year, month):
    """Inicio del periodo cuyo FIN cae en year/month en día corte_dia."""
    fin = datetime.date(year, month, corte_dia)
    try:
        inicio = fin.replace(day=corte_dia + 1) - relativedelta(months=1)
    except ValueError:
        # corte_dia + 1 > días del mes anterior
        inicio = (fin.replace(day=1) - relativedelta(months=1)).replace(day=corte_dia + 1)
    return inicio, fin


def create_statement_closed_and_paid(card, inicio, fin, pago_dia, gastos, paid_date):
    """Crea un statement cerrado y pagado con los gastos indicados."""
    if fin.day < pago_dia:
        fpl = fin.replace(day=pago_dia)
    else:
        fpl = (fin + relativedelta(months=1)).replace(day=pago_dia)

    saldo = sum(Decimal(str(g.mensualidad)) for g in gastos)
    stmt = CardStatement.objects.create(
        card=card,
        inicio=inicio,
        fin=fin,
        fecha_pago_limite=fpl,
        saldo_total=saldo,
        mensualidades=sum(Decimal(str(g.mensualidad)) for g in gastos if g.es_msi),
        estado="pagado",
        pagado_en=paid_date,
        monto_pagado=saldo,
        notas_pago="Pago seed",
    )
    return stmt


def create_open_statement(card, pago_dia):
    """Crea el statement abierto del periodo actual."""
    today = datetime.date.today()
    inicio, fin, fpl = make_period(card.corte_dia, pago_dia, today)
    stmt = CardStatement.objects.create(
        card=card,
        inicio=inicio,
        fin=fin,
        fecha_pago_limite=fpl,
        saldo_total=0,
        estado="abierto",
    )
    return stmt


# ─── Main ─────────────────────────────────────────────────────────────────────

user = User.objects.get(username=USERNAME)
today = datetime.date.today()

if RESET_CARDS:
    CreditCard.objects.filter(owner=user).delete()
    print("🗑️  Tarjetas anteriores eliminadas.")

# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 1 — Corte 12, pago últimos días (día 5 del mes siguiente = día 5)
# ══════════════════════════════════════════════════════════════════════════════
c1 = CreditCard.objects.create(
    owner=user,
    nombre="BBVA Azul",
    banco="BBVA",
    ultimos_4="4321",
    color="#3B82F6",
    limite_credito=Decimal("20000"),
    limite_mensual=Decimal("8000"),
    corte_dia=12,
    pago_dia=5,
    activa=True,
)
print(f"✅ Tarjeta creada: {c1.nombre}")

# Meses: nov-25 → mar-26  (5 periodos cerrados+pagados, 1 abierto)
PERIODOS_C1 = [
    # (año, mes_corte)  → periodo cuyo corte cae ese mes
    (2025, 11),
    (2025, 12),
    (2026,  1),
    (2026,  2),
    (2026,  3),
]

gastos_c1_plantilla = [
    # (descripcion, monto_total, dia_del_mes, es_msi, meses)
    ("Netflix",          199,  3, False, 1),
    ("Spotify",          129,  3, False, 1),
    ("Gasolina",         800,  7, False, 1),
    ("Despensa Walmart", 1500, 9, False, 1),
    ("Restaurante",      600,  5, False, 1),
    ("Amazon compra",    450,  6, False, 1),
]

# Compra MSI que se inicia en nov-25 a 6 meses
msi_c1 = CardExpense.objects.create(
    card=c1,
    descripcion="MacBook Air 6 MSI",
    fecha=datetime.date(2025, 11, 8),
    monto_total=Decimal("18000"),
    es_msi=True,
    meses=6,
    mes_actual=6,   # ya completado al llegar a hoy
    pagado=True,
)

for (año, mes) in PERIODOS_C1:
    inicio, fin = period_start(c1.corte_dia, año, mes)
    gastos_periodo = []
    for (desc, monto, dia, es_msi, meses) in gastos_c1_plantilla:
        try:
            fecha_gasto = inicio.replace(day=dia) + relativedelta(days=15)
        except ValueError:
            fecha_gasto = inicio + relativedelta(days=14)
        # Asegurar que la fecha cae en el periodo
        if fecha_gasto > fin:
            fecha_gasto = fin - datetime.timedelta(days=2)
        g = CardExpense.objects.create(
            card=c1,
            descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_gasto,
            monto_total=Decimal(str(monto)),
            es_msi=False,
            meses=1,
            mes_actual=1,
            pagado=True,
        )
        gastos_periodo.append(g)

    # Añadir mensualidad MSI al saldo
    gastos_periodo.append(msi_c1)

    paid_date = fin + datetime.timedelta(days=10)
    create_statement_closed_and_paid(c1, inicio, fin, c1.pago_dia, gastos_periodo, paid_date)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

# Gastos del periodo abierto actual (gastos no pagados)
inicio_act, fin_act, _ = make_period(c1.corte_dia, c1.pago_dia, today)
gastos_abiertos_c1 = [
    ("Netflix",          199,  False, 1),
    ("Spotify",          129,  False, 1),
    ("Gasolina",         750,  False, 1),
    ("Despensa Chedraui", 1200, False, 1),
    ("Laptop HP 12 MSI", 14400, True, 12),
]
for (desc, monto, es_msi, meses) in gastos_abiertos_c1:
    fecha_g = min(inicio_act + datetime.timedelta(days=5), today)
    if es_msi:
        meses_val = meses
    else:
        meses_val = 1
    CardExpense.objects.create(
        card=c1,
        descripcion=desc,
        fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi,
        meses=meses_val,
        mes_actual=1,
        pagado=False,
    )

create_open_statement(c1, c1.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 2 — Corte 16, pago primeros días (día 3)
# ══════════════════════════════════════════════════════════════════════════════
c2 = CreditCard.objects.create(
    owner=user,
    nombre="Banorte Oro",
    banco="Banorte",
    ultimos_4="8876",
    color="#F59E0B",
    limite_credito=Decimal("30000"),
    limite_mensual=Decimal("12000"),
    corte_dia=16,
    pago_dia=3,
    activa=True,
)
print(f"✅ Tarjeta creada: {c2.nombre}")

PERIODOS_C2 = [
    (2025, 11),
    (2025, 12),
    (2026,  1),
    (2026,  2),
    (2026,  3),
]

gastos_c2_plantilla = [
    ("Gasolina Premium",  950,  False),
    ("CFE Electricidad", 1200,  False),
    ("TELMEX Internet",   499,  False),
    ("Gym Mensualidad",   600,  False),
    ("Farmacia",          380,  False),
    ("Cine y palomitas",  450,  False),
    ("Ropa Liverpool",   1800,  False),
]

# MSI: iPhone 24 meses, inicia dic-25
msi_c2 = CardExpense.objects.create(
    card=c2,
    descripcion="iPhone 15 Pro 24 MSI",
    fecha=datetime.date(2025, 12, 5),
    monto_total=Decimal("28800"),
    es_msi=True,
    meses=24,
    mes_actual=4,   # dic/ene/feb/mar pagados
    pagado=False,
)

for (año, mes) in PERIODOS_C2:
    inicio, fin = period_start(c2.corte_dia, año, mes)
    gastos_periodo = []
    for i, (desc, monto, es_msi) in enumerate(gastos_c2_plantilla):
        fecha_gasto = inicio + datetime.timedelta(days=5 + i * 2)
        if fecha_gasto > fin:
            fecha_gasto = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c2,
            descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_gasto,
            monto_total=Decimal(str(monto)),
            es_msi=False,
            meses=1,
            mes_actual=1,
            pagado=True,
        )
        gastos_periodo.append(g)

    if año > 2025 or mes == 12:   # MSI aplica a partir de dic
        gastos_periodo.append(msi_c2)

    paid_date = fin + datetime.timedelta(days=7)
    create_statement_closed_and_paid(c2, inicio, fin, c2.pago_dia, gastos_periodo, paid_date)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

# Periodo abierto c2
inicio_act2, fin_act2, _ = make_period(c2.corte_dia, c2.pago_dia, today)
gastos_abiertos_c2 = [
    ("Gasolina Premium",  950,  False, 1),
    ("TELMEX Internet",   499,  False, 1),
    ("Gym Mensualidad",   600,  False, 1),
    ("Smart TV LG 6 MSI", 9600, True,  6),
]
for (desc, monto, es_msi, meses) in gastos_abiertos_c2:
    fecha_g = min(inicio_act2 + datetime.timedelta(days=4), today)
    CardExpense.objects.create(
        card=c2,
        descripcion=desc,
        fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi,
        meses=meses,
        mes_actual=1,
        pagado=False,
    )

create_open_statement(c2, c2.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 3 — Corte 25, pago día 15
# ══════════════════════════════════════════════════════════════════════════════
c3 = CreditCard.objects.create(
    owner=user,
    nombre="HSBC Platinum",
    banco="HSBC",
    ultimos_4="2255",
    color="#8B5CF6",
    limite_credito=Decimal("50000"),
    limite_mensual=Decimal("15000"),
    corte_dia=25,
    pago_dia=15,
    activa=True,
)
print(f"✅ Tarjeta creada: {c3.nombre}")

PERIODOS_C3 = [(2025, 11), (2025, 12), (2026, 1), (2026, 2), (2026, 3)]

for (año, mes) in PERIODOS_C3:
    inicio, fin = period_start(c3.corte_dia, año, mes)
    gastos_periodo = []
    plantilla_c3 = [
        ("Vuelo aéreo", 4500), ("Hotel", 3200), ("Uber Eats", 350),
        ("Suscripción Adobe", 890), ("Amazon Prime", 299),
    ]
    for i, (desc, monto) in enumerate(plantilla_c3):
        fecha_gasto = inicio + datetime.timedelta(days=3 + i * 4)
        if fecha_gasto > fin:
            fecha_gasto = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c3,
            descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_gasto,
            monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=12)
    create_statement_closed_and_paid(c3, inicio, fin, c3.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_act3, _, _ = make_period(c3.corte_dia, c3.pago_dia, today)
for (desc, monto, es_msi, meses) in [
    ("Uber Eats", 420, False, 1),
    ("Suscripción Adobe", 890, False, 1),
    ("Consola PS5 18 MSI", 12600, True, 18),
]:
    fecha_g = min(inicio_act3 + datetime.timedelta(days=3), today)
    CardExpense.objects.create(
        card=c3, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi, meses=meses, mes_actual=1, pagado=False,
    )

create_open_statement(c3, c3.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 4 — Corte 5, pago día 25 — casi siempre al tope
# ══════════════════════════════════════════════════════════════════════════════
c4 = CreditCard.objects.create(
    owner=user,
    nombre="Santander Zero",
    banco="Santander",
    ultimos_4="6643",
    color="#EF4444",
    limite_credito=Decimal("10000"),
    limite_mensual=Decimal("6000"),
    corte_dia=5,
    pago_dia=25,
    activa=True,
)
print(f"✅ Tarjeta creada: {c4.nombre}")

PERIODOS_C4 = [(2025, 11), (2025, 12), (2026, 1), (2026, 2), (2026, 3)]
for (año, mes) in PERIODOS_C4:
    inicio, fin = period_start(c4.corte_dia, año, mes)
    gastos_periodo = []
    for i, (desc, monto) in enumerate([
        ("Mercado", 2500), ("Gasolina", 700), ("Ropa", 1800), ("Farmacia", 450),
    ]):
        fecha_gasto = inicio + datetime.timedelta(days=2 + i * 5)
        if fecha_gasto > fin:
            fecha_gasto = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c4,
            descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_gasto,
            monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=15)
    create_statement_closed_and_paid(c4, inicio, fin, c4.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_act4, _, _ = make_period(c4.corte_dia, c4.pago_dia, today)
for (desc, monto) in [("Mercado", 2800), ("Gasolina", 650), ("Farmacia", 380)]:
    fecha_g = min(inicio_act4 + datetime.timedelta(days=2), today)
    CardExpense.objects.create(
        card=c4, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=False, meses=1, mes_actual=1, pagado=False,
    )

create_open_statement(c4, c4.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 5 — Corte 20, pago día 10 — viajes y entretenimiento
# ══════════════════════════════════════════════════════════════════════════════
c5 = CreditCard.objects.create(
    owner=user,
    nombre="Citibanamex Rewards",
    banco="Citibanamex",
    ultimos_4="9901",
    color="#10B981",
    limite_credito=Decimal("40000"),
    limite_mensual=Decimal("18000"),
    corte_dia=20,
    pago_dia=10,
    activa=True,
)
print(f"✅ Tarjeta creada: {c5.nombre}")

PERIODOS_C5 = [(2025, 11), (2025, 12), (2026, 1), (2026, 2), (2026, 3)]
for (año, mes) in PERIODOS_C5:
    inicio, fin = period_start(c5.corte_dia, año, mes)
    gastos_periodo = []
    for i, (desc, monto) in enumerate([
        ("Vuelo CDMX-CUN", 5500), ("Hotel Cancún", 4200),
        ("Tours", 1800), ("Restaurantes viaje", 2100), ("Souvenirs", 900),
    ]):
        fecha_gasto = inicio + datetime.timedelta(days=3 + i * 3)
        if fecha_gasto > fin:
            fecha_gasto = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c5,
            descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_gasto,
            monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=8)
    create_statement_closed_and_paid(c5, inicio, fin, c5.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_act5, _, _ = make_period(c5.corte_dia, c5.pago_dia, today)
for (desc, monto, es_msi, meses) in [
    ("Vuelo vacaciones", 7200, False, 1),
    ("Hotel reserva", 5600, False, 1),
    ("Cámara Sony 9 MSI", 13500, True, 9),
]:
    fecha_g = min(inicio_act5 + datetime.timedelta(days=4), today)
    CardExpense.objects.create(
        card=c5, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi, meses=meses, mes_actual=1, pagado=False,
    )

create_open_statement(c5, c5.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ─── Resumen ──────────────────────────────────────────────────────────────────
print("=" * 55)
print("✅ SEED completado")
print(f"   Tarjetas creadas : {CreditCard.objects.filter(owner=user).count()}")
print(f"   Gastos creados   : {CardExpense.objects.filter(card__owner=user).count()}")
print(f"   Statements       : {CardStatement.objects.filter(card__owner=user).count()}")
stmts = CardStatement.objects.filter(card__owner=user)
for s in stmts.order_by("card__nombre", "fin"):
    print(f"   [{s.estado:8s}] {s.card.nombre:22s}  {s.inicio}→{s.fin}")
print("=" * 55)
