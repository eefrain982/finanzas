"""
seed.py — Recrea datos de prueba para el módulo de tarjetas de crédito.

Uso dentro del contenedor:
    python manage.py shell < seed.py

O desde el host:
    docker exec -i personal_backend_1 python manage.py shell < seed.py

Tarjetas incluidas:
  1. RappiCard (Banorte) — datos REALES, 2 periodos históricos + periodo abierto
  2-5. Tarjetas ficticias de ejemplo
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
# TARJETA 1 — RappiCard (Banorte) — DATOS REALES
# Corte día 15, pago día 9
# ══════════════════════════════════════════════════════════════════════════════
rappi = CreditCard.objects.create(
    owner=user,
    nombre="RappiCard",
    banco="Banorte",
    ultimos_4="9982",
    color="#FF441A",  # naranja Rappi
    limite_credito=Decimal("25000"),
    limite_mensual=Decimal("25000"),
    corte_dia=15,
    pago_dia=9,
    activa=True,
)
print(f"✅ Tarjeta creada: {rappi.nombre}")

# ── Gastos que atraviesan múltiples periodos (MSI / diferidos) ────────────────
# Se crean una sola vez con el mes_actual al día de hoy (periodo abierto)

# Saldo Diferido — inicio may-25, 12 meses → mes 11 en periodo feb-mar
g_diferido = CardExpense.objects.create(
    card=rappi,
    descripcion="Saldo Diferido",
    fecha=datetime.date(2025, 5, 4),
    monto_total=Decimal("11850.65"),
    es_msi=False,
    meses=12,
    mes_actual=11,   # mes 11 al corte de feb-15
    pagado=False,
)

# MERCADO PAGO 1 — jun-25, 9 MSI → mes 9/9 en feb (último, se pagará)
g_merpago1 = CardExpense.objects.create(
    card=rappi,
    descripcion="MERCADO PAGO 1",
    fecha=datetime.date(2025, 6, 6),
    monto_total=Decimal("9859.32"),
    es_msi=True,
    meses=9,
    mes_actual=9,    # último mes en periodo ene-feb
    pagado=False,
)

# RESTA BAR SAN LUIS — jul-25, 12 meses → mes 8 en periodo feb-mar
g_resta_bar = CardExpense.objects.create(
    card=rappi,
    descripcion="RESTA BAR SAN LUIS",
    fecha=datetime.date(2025, 7, 24),
    monto_total=Decimal("1155.00"),
    es_msi=False,
    meses=12,
    mes_actual=8,
    pagado=False,
)

# USFUEL PISTOLAS meses — jul-25, 12 meses → mes 8 en periodo feb-mar
g_usfuel_msi = CardExpense.objects.create(
    card=rappi,
    descripcion="USFUEL PISTOLAS (meses)",
    fecha=datetime.date(2025, 7, 24),
    monto_total=Decimal("800.00"),
    es_msi=False,
    meses=12,
    mes_actual=8,
    pagado=False,
)

# MERPAGO 2 PRODUCTOS — sep-25, 9 MSI → mes 7 en periodo feb-mar
g_merpago2 = CardExpense.objects.create(
    card=rappi,
    descripcion="MERPAGO 2 PRODUCTOS",
    fecha=datetime.date(2025, 9, 4),
    monto_total=Decimal("1650.55"),
    es_msi=True,
    meses=9,
    mes_actual=7,
    pagado=False,
)

# MERPAGO MERCADOLIBRE — oct-25, 6 MSI → mes 5 en periodo feb-mar
g_merpago_ml = CardExpense.objects.create(
    card=rappi,
    descripcion="MERPAGO MERCADOLIBRE",
    fecha=datetime.date(2025, 10, 24),
    monto_total=Decimal("2160.48"),
    es_msi=True,
    meses=6,
    mes_actual=5,
    pagado=False,
)

# MERPAGO SONYMEXICO — dic-25, 12 MSI → mes 4 en periodo feb-mar
g_sony = CardExpense.objects.create(
    card=rappi,
    descripcion="MERPAGO SONYMEXICO",
    fecha=datetime.date(2025, 12, 11),
    monto_total=Decimal("4999.00"),
    es_msi=True,
    meses=12,
    mes_actual=4,
    pagado=False,
)

# GOB EDO DE CHIHUAHUA — ene-26, 3 meses → mes 3/3 en periodo feb-mar (último)
g_gob = CardExpense.objects.create(
    card=rappi,
    descripcion="GOB EDO DE CHIHUAHUA",
    fecha=datetime.date(2026, 1, 15),
    monto_total=Decimal("9192.00"),
    es_msi=False,
    meses=3,
    mes_actual=3,   # último mes en periodo feb-mar
    pagado=False,
)

# ── PERIODO 1: ene 16 – feb 15, 2026 (PAGADO) ────────────────────────────────
p1_inicio = datetime.date(2026, 1, 16)
p1_fin    = datetime.date(2026, 2, 15)
p1_fpl    = datetime.date(2026, 3, 9)

cargos_p1_normales = [
    ("OXXO DEPORTISTAS",      "102.00",   datetime.date(2026, 2,  9)),
    ("GAS ECONOMICO",         "175.00",   datetime.date(2026, 2,  9)),
    ("OXXO COLON",             "70.00",   datetime.date(2026, 2, 10)),
    ("USFUEL PISTOLAS",      "1000.00",   datetime.date(2026, 2, 10)),
    ("FERRETERIA SALVAL",     "140.00",   datetime.date(2026, 2, 10)),
    ("NAYAXX1 NAYAX RUTA 4",   "25.00",   datetime.date(2026, 2, 11)),
    ("COM RAP BUFFALUC CAFET", "125.00",  datetime.date(2026, 2, 11)),
    ("REST SEKORI",           "185.00",   datetime.date(2026, 2, 11)),
    ("ROCKO BARBER STORE",    "330.00",   datetime.date(2026, 2, 14)),
]

gastos_p1 = []
for (desc, monto, fecha) in cargos_p1_normales:
    g = CardExpense.objects.create(
        card=rappi, descripcion=desc, fecha=fecha,
        monto_total=Decimal(monto),
        es_msi=False, meses=1, mes_actual=1, pagado=True,
    )
    gastos_p1.append(g)

# Los MSI/diferidos que aparecen en este periodo (con sus mes_actual del periodo 1)
# Creamos versiones "históricas" de los gastos recurrentes para el cálculo del saldo
# El saldo real del estado de cuenta fue $21,357.22
stmt_p1 = CardStatement.objects.create(
    card=rappi,
    inicio=p1_inicio,
    fin=p1_fin,
    fecha_pago_limite=p1_fpl,
    saldo_total=Decimal("21357.22"),
    mensualidades=Decimal("21357.22"),  # todo era mensualidades/cargos
    pago_minimo=Decimal("5322.81"),
    estado="pagado",
    pagado_en=datetime.date(2026, 2, 28),
    monto_pagado=Decimal("21357.22"),
    notas_pago="Pago total periodo ene-feb",
)
print(f"   📄 Periodo {p1_inicio}→{p1_fin} creado y pagado  (saldo real: $21,357.22)")

# ── PERIODO 2: feb 16 – mar 15, 2026 (CERRADO — pendiente de pago) ────────────
p2_inicio = datetime.date(2026, 2, 16)
p2_fin    = datetime.date(2026, 3, 15)
p2_fpl    = datetime.date(2026, 4, 6)

cargos_p2_normales = [
    ("PANORAMA AZOTEA BAR",    "615.25",  datetime.date(2026, 2, 21)),
    ("ABTS EL SEMILLERO",       "94.00",  datetime.date(2026, 2, 22)),
    ("ABTS EL SEMILLERO",       "95.00",  datetime.date(2026, 2, 22)),
    ("OXXO VALLARTA",           "18.50",  datetime.date(2026, 2, 22)),
    ("REST MONT DU LAC",       "495.00",  datetime.date(2026, 2, 22)),
    ("REST SAMARA A ORTIZ M",  "325.00",  datetime.date(2026, 2, 23)),
    ("TACOS Y MONTADOS LA JU", "427.00",  datetime.date(2026, 2, 24)),
    ("USFUEL PISTOLAS",        "839.65",  datetime.date(2026, 2, 26)),
    ("ROCKO BARBER STORE",     "530.00",  datetime.date(2026, 2, 26)),
    ("DOGOS CHIHUAS",           "90.00",  datetime.date(2026, 2, 26)),
    ("BONZU",                  "554.00",  datetime.date(2026, 3,  6)),
    ("ALSUPER CAROLINAS",      "282.80",  datetime.date(2026, 3,  7)),
    ("CLIP MX REST ESSCC",     "385.00",  datetime.date(2026, 3,  7)),
    ("ABTS EL SEMILLERO",       "36.00",  datetime.date(2026, 3,  7)),
    ("REFACC EL PROFE",        "480.00",  datetime.date(2026, 3,  7)),
    ("Rappi",                  "200.00",  datetime.date(2026, 3,  7)),
]

gastos_p2 = []
for (desc, monto, fecha) in cargos_p2_normales:
    g = CardExpense.objects.create(
        card=rappi, descripcion=desc, fecha=fecha,
        monto_total=Decimal(monto),
        es_msi=False, meses=1, mes_actual=1, pagado=False,
    )
    gastos_p2.append(g)

# Statement cerrado con saldo real
stmt_p2 = CardStatement.objects.create(
    card=rappi,
    inicio=p2_inicio,
    fin=p2_fin,
    fecha_pago_limite=p2_fpl,
    saldo_total=Decimal("17639.86"),
    mensualidades=Decimal("17639.86"),
    pago_minimo=Decimal("5307.43"),
    estado="cerrado",
    pagado_en=None,
    monto_pagado=None,
    notas_pago="",
)
print(f"   📄 Periodo {p2_inicio}→{p2_fin} creado — CERRADO pendiente de pago  (saldo real: $17,639.86)")

# ── PERIODO 3 (abierto): mar 16 – abr 15, 2026 ───────────────────────────────
p3_stmt = create_open_statement(rappi, rappi.pago_dia)
print(f"   📄 Periodo abierto actual creado  ({p3_stmt.inicio}→{p3_stmt.fin})\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 2 — BBVA Azul (ficticia)
# ══════════════════════════════════════════════════════════════════════════════
c2 = CreditCard.objects.create(
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
print(f"✅ Tarjeta creada: {c2.nombre}")

PERIODOS_C2 = [(2025, 11), (2025, 12), (2026, 1), (2026, 2), (2026, 3)]
for (año, mes) in PERIODOS_C2:
    inicio, fin = period_start(c2.corte_dia, año, mes)
    gastos_periodo = []
    for i, (desc, monto) in enumerate([
        ("Netflix", 199), ("Spotify", 129), ("Gasolina", 800),
        ("Despensa Walmart", 1500), ("Restaurante", 600),
    ]):
        fecha_g = inicio + datetime.timedelta(days=3 + i * 4)
        if fecha_g > fin:
            fecha_g = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c2, descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_g, monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=10)
    create_statement_closed_and_paid(c2, inicio, fin, c2.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_c2, _, _ = make_period(c2.corte_dia, c2.pago_dia, today)
for (desc, monto, es_msi, meses) in [
    ("Netflix", 199, False, 1), ("Spotify", 129, False, 1),
    ("Gasolina", 850, False, 1), ("Laptop HP 12 MSI", 14400, True, 12),
]:
    fecha_g = min(inicio_c2 + datetime.timedelta(days=4), today)
    CardExpense.objects.create(
        card=c2, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi, meses=meses, mes_actual=1, pagado=False,
    )
create_open_statement(c2, c2.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 3 — HSBC Platinum (ficticia)
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
    for i, (desc, monto) in enumerate([
        ("Vuelo aéreo", 4500), ("Hotel", 3200), ("Uber Eats", 350),
        ("Suscripción Adobe", 890), ("Amazon Prime", 299),
    ]):
        fecha_g = inicio + datetime.timedelta(days=3 + i * 4)
        if fecha_g > fin:
            fecha_g = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c3, descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_g, monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=12)
    create_statement_closed_and_paid(c3, inicio, fin, c3.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_c3, _, _ = make_period(c3.corte_dia, c3.pago_dia, today)
for (desc, monto, es_msi, meses) in [
    ("Uber Eats", 420, False, 1), ("Suscripción Adobe", 890, False, 1),
    ("Consola PS5 18 MSI", 12600, True, 18),
]:
    fecha_g = min(inicio_c3 + datetime.timedelta(days=3), today)
    CardExpense.objects.create(
        card=c3, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi, meses=meses, mes_actual=1, pagado=False,
    )
create_open_statement(c3, c3.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 4 — Santander Zero (ficticia)
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
        fecha_g = inicio + datetime.timedelta(days=2 + i * 5)
        if fecha_g > fin:
            fecha_g = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c4, descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_g, monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=15)
    create_statement_closed_and_paid(c4, inicio, fin, c4.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_c4, _, _ = make_period(c4.corte_dia, c4.pago_dia, today)
for (desc, monto) in [("Mercado", 2800), ("Gasolina", 650), ("Farmacia", 380)]:
    fecha_g = min(inicio_c4 + datetime.timedelta(days=2), today)
    CardExpense.objects.create(
        card=c4, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=False, meses=1, mes_actual=1, pagado=False,
    )
create_open_statement(c4, c4.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ══════════════════════════════════════════════════════════════════════════════
# TARJETA 5 — Citibanamex Rewards (ficticia)
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
        fecha_g = inicio + datetime.timedelta(days=3 + i * 3)
        if fecha_g > fin:
            fecha_g = fin - datetime.timedelta(days=1)
        g = CardExpense.objects.create(
            card=c5, descripcion=f"{desc} {fin.strftime('%b %y')}",
            fecha=fecha_g, monto_total=Decimal(str(monto)),
            es_msi=False, meses=1, mes_actual=1, pagado=True,
        )
        gastos_periodo.append(g)
    paid = fin + datetime.timedelta(days=8)
    create_statement_closed_and_paid(c5, inicio, fin, c5.pago_dia, gastos_periodo, paid)
    print(f"   📄 Periodo {inicio}→{fin} creado y pagado")

inicio_c5, _, _ = make_period(c5.corte_dia, c5.pago_dia, today)
for (desc, monto, es_msi, meses) in [
    ("Vuelo vacaciones", 7200, False, 1), ("Hotel reserva", 5600, False, 1),
    ("Cámara Sony 9 MSI", 13500, True, 9),
]:
    fecha_g = min(inicio_c5 + datetime.timedelta(days=4), today)
    CardExpense.objects.create(
        card=c5, descripcion=desc, fecha=fecha_g,
        monto_total=Decimal(str(monto)),
        es_msi=es_msi, meses=meses, mes_actual=1, pagado=False,
    )
create_open_statement(c5, c5.pago_dia)
print(f"   📄 Periodo abierto actual creado\n")


# ─── Resumen ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("✅ SEED completado")
print(f"   Tarjetas creadas : {CreditCard.objects.filter(owner=user).count()}")
print(f"   Gastos creados   : {CardExpense.objects.filter(card__owner=user).count()}")
print(f"   Statements       : {CardStatement.objects.filter(card__owner=user).count()}")
stmts = CardStatement.objects.filter(card__owner=user)
for s in stmts.order_by("card__nombre", "fin"):
    saldo = f"${s.saldo_total:,.2f}" if s.saldo_total else "—"
    print(f"   [{s.estado:8s}] {s.card.nombre:22s}  {s.inicio}→{s.fin}  {saldo}")
print("=" * 60)


