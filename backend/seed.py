"""
seed.py — Recrea datos reales de tarjetas de crédito.

Uso desde el host:
    docker exec -i personal_backend_1 python manage.py shell < backend/seed.py

Tarjetas incluidas:
  1. RappiCard Banorte ···9982
     - Periodo 1: 2026-01-16 → 2026-02-15 (cerrado+pagado)
     - Periodo 2: 2026-02-16 → 2026-03-15 (cerrado — pendiente de pago)
     - Periodo 3: 2026-03-16 → 2026-04-15 (abierto)
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
# RappiCard Banorte ···9982
#   Corte: día 15  |  Pago: día 9 (aproximado — varía por calendario)
#   Límite: $25,000
# ══════════════════════════════════════════════════════════════════════════════
card = CreditCard.objects.create(
    owner=user,
    nombre="RappiCard",
    banco="Banorte",
    ultimos_4="9982",
    color="#F97316",
    limite_credito=Decimal("25000"),
    limite_mensual=Decimal("25000"),
    corte_dia=15,
    pago_dia=9,
    activa=True,
)
print(f"✅ Tarjeta creada: {card.nombre} ···{card.ultimos_4}")

# ──────────────────────────────────────────────────────────────────────────────
# Gastos a meses — existen a lo largo de múltiples periodos
# Se crean primero porque los statements los referencian.
# mes_actual y pagado reflejan el estado AL DÍA DE HOY (después del periodo 2).
# ──────────────────────────────────────────────────────────────────────────────

# Saldo Diferido — 12 MSI con intereses, inicio mayo-2025
# En periodo 2: mes 11/12 → después del pago queda mes 12 (último)
g_diferido = CardExpense.objects.create(
    card=card,
    descripcion="Saldo Diferido",
    fecha=datetime.date(2025, 5, 4),
    monto_total=Decimal("11850.65"),
    es_msi=False,
    meses=12,
    mes_actual=11,   # periodo 2 fue mes 11; el 12 queda pendiente en periodo 3
    pagado=False,
)

# MERCADO PAGO 1 — 9 MSI sin intereses, inicio jun-2025
# En periodo 1: mes 9/9 → ya liquidado tras el pago del periodo 1
g_mp1 = CardExpense.objects.create(
    card=card,
    descripcion="MERCADO PAGO 1",
    fecha=datetime.date(2025, 6, 6),
    monto_total=Decimal("9859.32"),
    es_msi=True,
    meses=9,
    mes_actual=9,
    pagado=True,   # se completó en periodo 1
)

# RESTA BAR SAN LUIS — 12 MSI con intereses, inicio jul-2025
# En periodo 2: mes 8/12 → pendiente
g_resta_bar = CardExpense.objects.create(
    card=card,
    descripcion="RESTA BAR SAN LUIS",
    fecha=datetime.date(2025, 7, 24),
    monto_total=Decimal("1155.00"),
    es_msi=False,
    meses=12,
    mes_actual=8,
    pagado=False,
)

# USFUEL PISTOLAS (MSI) — 12 MSI con intereses, inicio jul-2025
# Distinto al cargo regular de gasolina con mismo nombre
g_usfuel_msi = CardExpense.objects.create(
    card=card,
    descripcion="USFUEL PISTOLAS (MCI)",
    fecha=datetime.date(2025, 7, 24),
    monto_total=Decimal("800.00"),
    es_msi=False,
    meses=12,
    mes_actual=8,
    pagado=False,
)

# MERPAGO 2 PRODUCTOS — 9 MSI sin intereses, inicio sep-2025
# En periodo 2: mes 7/9 → pendiente
g_mp2 = CardExpense.objects.create(
    card=card,
    descripcion="MERPAGO 2 PRODUCTOS",
    fecha=datetime.date(2025, 9, 4),
    monto_total=Decimal("1650.55"),
    es_msi=True,
    meses=9,
    mes_actual=7,
    pagado=False,
)

# MERPAGO MERCADOLIBRE — 6 MSI sin intereses, inicio oct-2025
# En periodo 2: mes 5/6 → pendiente (mes 6 queda en periodo 3)
g_mp_ml = CardExpense.objects.create(
    card=card,
    descripcion="MERPAGO MERCADOLIBRE",
    fecha=datetime.date(2025, 10, 24),
    monto_total=Decimal("2160.48"),
    es_msi=True,
    meses=6,
    mes_actual=5,
    pagado=False,
)

# MERPAGO SONYMEXICO — 12 MSI sin intereses, inicio dic-2025
# En periodo 2: mes 4/12 → pendiente
g_sony = CardExpense.objects.create(
    card=card,
    descripcion="MERPAGO SONYMEXICO",
    fecha=datetime.date(2025, 12, 11),
    monto_total=Decimal("4999.00"),
    es_msi=True,
    meses=12,
    mes_actual=4,
    pagado=False,
)

# GOB EDO DE CHIHUAHUA — 3 MCI con intereses, inicio ene-2026
# En periodo 2: mes 3/3 → última cuota, se liquida
g_gob = CardExpense.objects.create(
    card=card,
    descripcion="GOB EDO DE CHIHUAHUA",
    fecha=datetime.date(2026, 1, 15),
    monto_total=Decimal("9192.00"),
    es_msi=False,
    meses=3,
    mes_actual=3,
    pagado=True,   # última cuota cobrada en periodo 2 → liquidado
)

print("   💳 Gastos a meses creados")

# ──────────────────────────────────────────────────────────────────────────────
# PERIODO 1 — 2026-01-16 → 2026-02-15  [cerrado + PAGADO]
# Pago registrado: $7,783.03 el ~2026-03-09
# ──────────────────────────────────────────────────────────────────────────────
p1_inicio = datetime.date(2026, 1, 16)
p1_fin    = datetime.date(2026, 2, 15)
p1_fpl    = datetime.date(2026, 3, 9)

cargos_regulares_p1 = [
    ("OXXO DEPORTISTAS",       "102.00",  "2026-02-09"),
    ("GAS ECONOMICO",          "175.00",  "2026-02-09"),
    ("OXXO COLON",              "70.00",  "2026-02-10"),
    ("USFUEL PISTOLAS",       "1000.00",  "2026-02-10"),
    ("FERRETERIA SALVAL",      "140.00",  "2026-02-10"),
    ("NAYAXX1 NAYAX RUTA 4",    "25.00",  "2026-02-11"),
    ("COM RAP BUFFALUC CAFET", "125.00",  "2026-02-11"),
    ("REST SEKORI",            "185.00",  "2026-02-11"),
    ("ROCKO BARBER STORE",     "330.00",  "2026-02-14"),
]

gastos_p1 = []
for (desc, monto, fecha) in cargos_regulares_p1:
    g = CardExpense.objects.create(
        card=card,
        descripcion=desc,
        fecha=datetime.date.fromisoformat(fecha),
        monto_total=Decimal(monto),
        es_msi=False, meses=1, mes_actual=1,
        pagado=True,
    )
    gastos_p1.append(g)

# Cargos a meses que estaban activos en periodo 1
gastos_p1_msi = [g_diferido, g_mp1, g_resta_bar, g_usfuel_msi, g_mp2, g_mp_ml, g_sony, g_gob]

saldo_p1 = Decimal("9467.23")    # pago para NO generar intereses
stmt_p1 = CardStatement.objects.create(
    card=card,
    inicio=p1_inicio,
    fin=p1_fin,
    fecha_pago_limite=p1_fpl,
    saldo_periodo=Decimal("21357.22"),   # deuda TOTAL incluyendo meses diferidos
    saldo_total=saldo_p1,
    mensualidades=Decimal("1095.48") + Decimal("183.39") + Decimal("360.08") + Decimal("416.58"),
    pago_minimo=Decimal("5322.81"),
    estado="pagado",
    pagado_en=datetime.date(2026, 3, 9),
    monto_pagado=Decimal("7783.03"),
    notas_pago="Pago parcial — no cubre total",
)
print(f"   📄 Periodo 1 ({p1_inicio}→{p1_fin}) creado y pagado")

# ──────────────────────────────────────────────────────────────────────────────
# PERIODO 2 — 2026-02-16 → 2026-03-15  [CERRADO — pendiente de pago]
# Pago registrado: $9,699.23  (ya aplicado, el statement queda "cerrado")
# Nota: aunque el pago se realizó, se deja en cerrado para simular
#       que aún hay saldo pendiente (saldo_deudor_total = 17,639.86)
# ──────────────────────────────────────────────────────────────────────────────
p2_inicio = datetime.date(2026, 2, 16)
p2_fin    = datetime.date(2026, 3, 15)
p2_fpl    = datetime.date(2026, 4, 6)

cargos_regulares_p2 = [
    ("PANORAMA AZOTEA BAR",    "615.25",  "2026-02-21"),
    ("ABTS EL SEMILLERO",       "94.00",  "2026-02-22"),
    ("ABTS EL SEMILLERO",       "95.00",  "2026-02-22"),
    ("OXXO VALLARTA",           "18.50",  "2026-02-22"),
    ("REST MONT DU LAC",       "495.00",  "2026-02-22"),
    ("REST SAMARA A ORTIZ M",  "325.00",  "2026-02-23"),
    ("TACOS Y MONTADOS LA JU", "427.00",  "2026-02-24"),
    ("USFUEL PISTOLAS",        "839.65",  "2026-02-26"),
    ("ROCKO BARBER STORE",     "530.00",  "2026-02-26"),
    ("DOGOS CHIHUAS",           "90.00",  "2026-02-26"),
    ("BONZU",                  "554.00",  "2026-03-06"),
    ("ALSUPER CAROLINAS",      "282.80",  "2026-03-07"),
    ("CLIP MX REST ESSCC",     "385.00",  "2026-03-07"),
    ("ABTS EL SEMILLERO",       "36.00",  "2026-03-07"),
    ("REFACC EL PROFE",        "480.00",  "2026-03-07"),
    # Rappi $200 bonificado — lo incluimos para historial pero marcado pagado
    ("Rappi (bonificación)",   "200.00",  "2026-03-07"),
]

gastos_p2 = []
for (desc, monto, fecha) in cargos_regulares_p2:
    g = CardExpense.objects.create(
        card=card,
        descripcion=desc,
        fecha=datetime.date.fromisoformat(fecha),
        monto_total=Decimal(monto),
        es_msi=False, meses=1, mes_actual=1,
        pagado=True,   # el pago de $9,699 cubrió los cargos regulares
    )
    gastos_p2.append(g)

# saldo_periodo = saldo total incluyendo meses diferidos (suma de ambas columnas del estado de cuenta)
# saldo_total   = pago para no generar intereses = $11,409.75
saldo_p2 = Decimal("11409.75")
stmt_p2 = CardStatement.objects.create(
    card=card,
    inicio=p2_inicio,
    fin=p2_fin,
    fecha_pago_limite=p2_fpl,
    saldo_periodo=Decimal("17639.86"),   # 11,409.75 + 6,230.11 (meses pendientes)
    saldo_total=saldo_p2,
    mensualidades=Decimal("183.39") + Decimal("360.08") + Decimal("416.58"),
    pago_minimo=Decimal("5307.43"),
    estado="cerrado",
    pagado_en=None,
    monto_pagado=None,
    notas_pago="",
)
print(f"   📄 Periodo 2 ({p2_inicio}→{p2_fin}) cerrado — pendiente de pago")

# ──────────────────────────────────────────────────────────────────────────────
# PERIODO 3 — 2026-03-16 → 2026-04-15  [ABIERTO — actual]
# Gastos que van entrando en el periodo actual (ninguno aún)
# ──────────────────────────────────────────────────────────────────────────────
p3_inicio = datetime.date(2026, 3, 16)
p3_fin    = datetime.date(2026, 4, 15)
p3_fpl    = datetime.date(2026, 5, 9)

stmt_p3 = CardStatement.objects.create(
    card=card,
    inicio=p3_inicio,
    fin=p3_fin,
    fecha_pago_limite=p3_fpl,
    saldo_total=Decimal("0"),
    estado="abierto",
)
print(f"   📄 Periodo 3 ({p3_inicio}→{p3_fin}) abierto\n")

# ─── Resumen ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("✅ SEED completado")
print(f"   Tarjetas  : {CreditCard.objects.filter(owner=user).count()}")
print(f"   Gastos    : {CardExpense.objects.filter(card__owner=user).count()}")
print(f"   Statements: {CardStatement.objects.filter(card__owner=user).count()}")
print()
for s in CardStatement.objects.filter(card__owner=user).order_by("fin"):
    saldo_str = f"${s.saldo_total:>10,.2f}"
    pagado_str = f"  pagado ${s.monto_pagado:,.2f}" if s.monto_pagado else ""
    print(f"   [{s.estado:8s}] {s.inicio}→{s.fin}  {saldo_str}{pagado_str}")
print()
print("   Gastos a meses activos (no pagados):")
for g in CardExpense.objects.filter(card__owner=user, es_msi=False, pagado=False, meses__gt=1):
    print(f"   MCI  {g.descripcion:30s} {g.mes_actual}/{g.meses} mensualidad ${float(g.mensualidad):,.2f}")
for g in CardExpense.objects.filter(card__owner=user, es_msi=True, pagado=False):
    print(f"   MSI  {g.descripcion:30s} {g.mes_actual}/{g.meses} mensualidad ${float(g.mensualidad):,.2f}")
print("=" * 60)

