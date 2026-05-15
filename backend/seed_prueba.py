"""
seed_prueba.py — 3 tarjetas de prueba con historial de 4 meses.

Corte: día 15 de cada mes
Pago:  día 5 del mes siguiente al corte

Periodos generados (hoy = 2026-04-01):
  P1: 2025-12-16 → 2026-01-15  [pagado]
  P2: 2026-01-16 → 2026-02-15  [pagado]
  P3: 2026-02-16 → 2026-03-15  [pagado]
  P4: 2026-03-16 → 2026-04-15  [abierto — actual]

Uso:
    docker exec -i personal_backend_1 python manage.py shell < backend/seed_prueba.py
"""

import datetime
from decimal import Decimal
from django.contrib.auth.models import User
from api.models import CreditCard, CardExpense, CardStatement

# ─── Config ───────────────────────────────────────────────────────────────────
USERNAME    = "admin"
CORTE_DIA   = 15
PAGO_DIA    = 5
RESET_CARDS = True

user  = User.objects.get(username=USERNAME)
today = datetime.date.today()

if RESET_CARDS:
    CreditCard.objects.filter(owner=user).delete()
    print("🗑️  Tarjetas anteriores eliminadas.")

# ─── Periodos ─────────────────────────────────────────────────────────────────
# P1: dic-2025  P2: ene-2026  P3: feb-2026  P4: mar-2026 (abierto)
periodos = [
    {
        "num": 1,
        "inicio": datetime.date(2025, 12, 16),
        "fin":    datetime.date(2026,  1, 15),
        "fpl":    datetime.date(2026,  2,  5),
        "estado": "pagado",
        "pagado_en": datetime.date(2026, 2, 4),
    },
    {
        "num": 2,
        "inicio": datetime.date(2026,  1, 16),
        "fin":    datetime.date(2026,  2, 15),
        "fpl":    datetime.date(2026,  3,  5),
        "estado": "pagado",
        "pagado_en": datetime.date(2026, 3, 3),
    },
    {
        "num": 3,
        "inicio": datetime.date(2026,  2, 16),
        "fin":    datetime.date(2026,  3, 15),
        "fpl":    datetime.date(2026,  4,  5),
        "estado": "pagado",
        "pagado_en": datetime.date(2026, 4, 1),
    },
    {
        "num": 4,
        "inicio": datetime.date(2026,  3, 16),
        "fin":    datetime.date(2026,  4, 15),
        "fpl":    datetime.date(2026,  5,  5),
        "estado": "abierto",
        "pagado_en": None,
    },
]

# ══════════════════════════════════════════════════════════════════════════════
# TARJETA A — Solo gastos normales (sin MSI)
# Límite: $10,000
# Cada periodo tiene 3-4 gastos de una sola exhibición
# ══════════════════════════════════════════════════════════════════════════════
cardA = CreditCard.objects.create(
    owner=user,
    nombre="Tarjeta A — Solo normales",
    banco="Banco Prueba",
    ultimos_4="1111",
    color="#3B82F6",
    limite_credito=Decimal("10000"),
    limite_mensual=Decimal("10000"),
    corte_dia=CORTE_DIA,
    pago_dia=PAGO_DIA,
    activa=True,
)
print(f"\n✅ {cardA.nombre}")

# Gastos normales por periodo (descripcion, monto, fecha)
gastos_normalesA = {
    1: [
        ("SUPER WALMART",  "850.00",  "2025-12-20"),
        ("GASOLINERA",     "600.00",  "2025-12-28"),
        ("RESTAURANTE",    "450.00",  "2026-01-05"),
        ("FARMACIA",       "320.00",  "2026-01-10"),
    ],
    2: [
        ("SUPER WALMART",  "920.00",  "2026-01-18"),
        ("GASOLINERA",     "550.00",  "2026-01-25"),
        ("ELECTRICISTA",   "1200.00", "2026-02-02"),
        ("CINE",           "280.00",  "2026-02-10"),
    ],
    3: [
        ("SUPER WALMART",  "870.00",  "2026-02-20"),
        ("GASOLINERA",     "620.00",  "2026-02-27"),
        ("DENTISTA",       "1500.00", "2026-03-05"),
        ("RESTAURANTE",    "380.00",  "2026-03-12"),
    ],
    4: [
        ("SUPER WALMART",  "900.00",  "2026-03-18"),
        ("GASOLINERA",     "580.00",  "2026-03-25"),
    ],
}

for p in periodos:
    n    = p["num"]
    items = gastos_normalesA.get(n, [])
    gastos = []
    for (desc, monto, fecha) in items:
        g = CardExpense.objects.create(
            card=cardA,
            descripcion=desc,
            fecha=datetime.date.fromisoformat(fecha),
            monto_total=Decimal(monto),
            es_msi=False, meses=1, mes_actual=1,
            pagado=(p["estado"] != "abierto"),
        )
        gastos.append(g)

    saldo = sum(Decimal(g.monto_total) for g in gastos)

    if p["estado"] == "abierto":
        CardStatement.objects.create(
            card=cardA, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"], saldo_total=Decimal("0"), estado="abierto",
        )
    else:
        CardStatement.objects.create(
            card=cardA, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"],
            saldo_total=saldo, saldo_periodo=saldo, mensualidades=Decimal("0"),
            estado=p["estado"], pagado_en=p["pagado_en"], monto_pagado=saldo,
        )
    print(f"   P{n} [{p['estado']:6}] {p['inicio']}→{p['fin']}  saldo={saldo}")

# ══════════════════════════════════════════════════════════════════════════════
# TARJETA B — Gastos normales + MSI sin intereses
# Límite: $15,000
# Tiene compras a 3 y 6 MSI que cruzan varios periodos
# ══════════════════════════════════════════════════════════════════════════════
cardB = CreditCard.objects.create(
    owner=user,
    nombre="Tarjeta B — Normales + MSI",
    banco="Banco Prueba",
    ultimos_4="2222",
    color="#10B981",
    limite_credito=Decimal("15000"),
    limite_mensual=Decimal("15000"),
    corte_dia=CORTE_DIA,
    pago_dia=PAGO_DIA,
    activa=True,
)
print(f"\n✅ {cardB.nombre}")

# MSI 1: $3,000 a 3 meses → mensualidad $1,000
#   compra: 2025-12-20  →  meses: dic P1(1/3), ene P2(2/3), feb P3(3/3) → liquidado en P3
g_msiB1 = CardExpense.objects.create(
    card=cardB,
    descripcion="LAPTOP MSI 3M",
    fecha=datetime.date(2025, 12, 20),
    monto_total=Decimal("3000.00"),
    es_msi=True, meses=3, mes_actual=3,
    pagado=True,   # completó 3/3 en P3
)

# MSI 2: $6,000 a 6 meses → mensualidad $1,000
#   compra: 2026-01-20  →  P2(1/6), P3(2/6), P4(3/6)... sigue activo
g_msiB2 = CardExpense.objects.create(
    card=cardB,
    descripcion="CELULAR MSI 6M",
    fecha=datetime.date(2026, 1, 20),
    monto_total=Decimal("6000.00"),
    es_msi=True, meses=6, mes_actual=3,
    pagado=False,   # activo, va en P4
)

# Gastos normales por periodo
gastos_normalesB = {
    1: [
        ("SUPER",    "600.00",  "2025-12-22"),
        ("GAS",      "400.00",  "2026-01-08"),
    ],
    2: [
        ("SUPER",    "650.00",  "2026-01-20"),
        ("GAS",      "350.00",  "2026-02-01"),
        ("FARMACIA", "280.00",  "2026-02-10"),
    ],
    3: [
        ("SUPER",    "700.00",  "2026-02-22"),
        ("GAS",      "420.00",  "2026-03-01"),
    ],
    4: [
        ("SUPER",    "680.00",  "2026-03-20"),
    ],
}

# MSI activos por periodo (para calcular mensualidades en el statement)
msi_activos_por_periodo = {
    1: [g_msiB1],           # LAPTOP mes 1/3
    2: [g_msiB1, g_msiB2],  # LAPTOP mes 2/3 + CELULAR mes 1/6
    3: [g_msiB1, g_msiB2],  # LAPTOP mes 3/3 + CELULAR mes 2/6
    4: [g_msiB2],           # CELULAR mes 3/6
}

for p in periodos:
    n     = p["num"]
    items = gastos_normalesB.get(n, [])
    gn    = []
    for (desc, monto, fecha) in items:
        g = CardExpense.objects.create(
            card=cardB,
            descripcion=desc,
            fecha=datetime.date.fromisoformat(fecha),
            monto_total=Decimal(monto),
            es_msi=False, meses=1, mes_actual=1,
            pagado=(p["estado"] != "abierto"),
        )
        gn.append(g)

    msi_periodo = msi_activos_por_periodo.get(n, [])
    saldo_normales    = sum(Decimal(g.monto_total) for g in gn)
    saldo_mensualidades = sum(Decimal(str(g.mensualidad)) for g in msi_periodo)
    saldo_total       = saldo_normales + saldo_mensualidades

    # saldo_periodo = saldo_total + mensualidades de meses FUTUROS de los MSI activos
    # (lo que el banco llama "saldo total del periodo")
    msi_futuros = sum(
        Decimal(str(g.mensualidad)) * (g.meses - g.mes_actual)
        for g in msi_periodo
    )
    saldo_periodo = saldo_total + msi_futuros

    if p["estado"] == "abierto":
        CardStatement.objects.create(
            card=cardB, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"], saldo_total=Decimal("0"), estado="abierto",
        )
    else:
        CardStatement.objects.create(
            card=cardB, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"],
            saldo_total=saldo_total,
            saldo_periodo=saldo_periodo,
            mensualidades=saldo_mensualidades,
            estado=p["estado"], pagado_en=p["pagado_en"], monto_pagado=saldo_total,
        )
    print(f"   P{n} [{p['estado']:6}] {p['inicio']}→{p['fin']}  normales={saldo_normales}  msi_mes={saldo_mensualidades}  total={saldo_total}")

# ══════════════════════════════════════════════════════════════════════════════
# TARJETA C — Mezcla: normales + MSI largo + MCI (meses con intereses)
# Límite: $20,000
# ══════════════════════════════════════════════════════════════════════════════
cardC = CreditCard.objects.create(
    owner=user,
    nombre="Tarjeta C — Mezcla completa",
    banco="Banco Prueba",
    ultimos_4="3333",
    color="#8B5CF6",
    limite_credito=Decimal("20000"),
    limite_mensual=Decimal("20000"),
    corte_dia=CORTE_DIA,
    pago_dia=PAGO_DIA,
    activa=True,
)
print(f"\n✅ {cardC.nombre}")

# MSI: $12,000 a 12 meses sin intereses → mensualidad $1,000
#   compra: 2025-12-10  → P1(1/12), P2(2/12), P3(3/12), P4(4/12)...
g_msiC1 = CardExpense.objects.create(
    card=cardC,
    descripcion="TV 12 MSI",
    fecha=datetime.date(2025, 12, 10),
    monto_total=Decimal("12000.00"),
    es_msi=True, meses=12, mes_actual=4,
    pagado=False,
)

# MCI: $4,800 a 12 meses CON intereses → mensualidad $450 (incluye intereses)
#   compra: 2026-01-05  → P2(1/12), P3(2/12), P4(3/12)...
g_mciC1 = CardExpense.objects.create(
    card=cardC,
    descripcion="REFRI MCI 12M",
    fecha=datetime.date(2026, 1, 5),
    monto_total=Decimal("4800.00"),
    es_msi=False, meses=12, mes_actual=3,
    pagado=False,
)

gastos_normalesC = {
    1: [
        ("SUPER",      "500.00",  "2025-12-18"),
        ("ROPA",      "1200.00",  "2025-12-22"),
        ("GAS",        "350.00",  "2026-01-10"),
    ],
    2: [
        ("SUPER",      "480.00",  "2026-01-19"),
        ("RESTAURANTE","650.00",  "2026-01-28"),
        ("GAS",        "400.00",  "2026-02-05"),
    ],
    3: [
        ("SUPER",      "520.00",  "2026-02-19"),
        ("GAS",        "380.00",  "2026-03-03"),
        ("FARMACIA",   "290.00",  "2026-03-10"),
    ],
    4: [
        ("SUPER",      "560.00",  "2026-03-20"),
        ("GAS",        "410.00",  "2026-03-28"),
    ],
}

diferidos_por_periodo = {
    1: [g_msiC1],           # TV mes 1
    2: [g_msiC1, g_mciC1],  # TV mes 2 + REFRI mes 1
    3: [g_msiC1, g_mciC1],  # TV mes 3 + REFRI mes 2
    4: [g_msiC1, g_mciC1],  # TV mes 4 + REFRI mes 3
}

for p in periodos:
    n     = p["num"]
    items = gastos_normalesC.get(n, [])
    gn    = []
    for (desc, monto, fecha) in items:
        g = CardExpense.objects.create(
            card=cardC,
            descripcion=desc,
            fecha=datetime.date.fromisoformat(fecha),
            monto_total=Decimal(monto),
            es_msi=False, meses=1, mes_actual=1,
            pagado=(p["estado"] != "abierto"),
        )
        gn.append(g)

    dif_periodo = diferidos_por_periodo.get(n, [])
    saldo_normales      = sum(Decimal(g.monto_total) for g in gn)
    saldo_mensualidades = sum(Decimal(str(g.mensualidad)) for g in dif_periodo)
    saldo_total         = saldo_normales + saldo_mensualidades

    msi_futuros = sum(
        Decimal(str(g.mensualidad)) * (g.meses - g.mes_actual)
        for g in dif_periodo
    )
    saldo_periodo = saldo_total + msi_futuros

    if p["estado"] == "abierto":
        CardStatement.objects.create(
            card=cardC, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"], saldo_total=Decimal("0"), estado="abierto",
        )
    else:
        CardStatement.objects.create(
            card=cardC, inicio=p["inicio"], fin=p["fin"],
            fecha_pago_limite=p["fpl"],
            saldo_total=saldo_total,
            saldo_periodo=saldo_periodo,
            mensualidades=saldo_mensualidades,
            estado=p["estado"], pagado_en=p["pagado_en"], monto_pagado=saldo_total,
        )
    print(f"   P{n} [{p['estado']:6}] {p['inicio']}→{p['fin']}  normales={saldo_normales}  dif_mes={saldo_mensualidades}  total={saldo_total}")

# ─── Resumen ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 70)
print("✅ SEED DE PRUEBA completado")
print(f"   Tarjetas  : {CreditCard.objects.filter(owner=user).count()}")
print(f"   Gastos    : {CardExpense.objects.filter(card__owner=user).count()}")
print(f"   Statements: {CardStatement.objects.filter(card__owner=user).count()}")
print()

for card in CreditCard.objects.filter(owner=user).order_by("id"):
    print(f"  💳 {card.nombre}")
    for s in CardStatement.objects.filter(card=card).order_by("fin"):
        saldo_str = f"saldo_total=${s.saldo_total:>8,.2f}  saldo_periodo=${s.saldo_periodo:>8,.2f}"
        pago_str  = f"  pagado=${s.monto_pagado:,.2f}" if s.monto_pagado else ""
        print(f"     [{s.estado:6}] {s.inicio}→{s.fin}  {saldo_str}{pago_str}")
    print()

print("  Diferidos activos (no pagados, meses>1):")
for g in CardExpense.objects.filter(card__owner=user, pagado=False, meses__gt=1).order_by("card"):
    print(f"   {g.card.ultimos_4}  {g.descripcion:25s}  mes={g.mes_actual}/{g.meses}  mensualidad=${float(g.mensualidad):,.2f}  msi={g.es_msi}")
print("=" * 70)
