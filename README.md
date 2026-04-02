# Finanzas — Guía de operaciones

App de finanzas personales con gestión de tarjetas de crédito, estados de cuenta y presupuestos.

- **Backend**: Django 6 + Django REST Framework + JWT
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Base de datos**: PostgreSQL 16
- **Infraestructura**: Docker + Docker Compose

---

## Estructura del proyecto

```
personal/
├── backend/
│   ├── api/
│   │   ├── models.py          # Modelos: CreditCard, CardStatement, CardExpense, etc.
│   │   ├── serializers.py     # Serializadores DRF
│   │   ├── views.py           # Endpoints (api_view decorators)
│   │   ├── urls.py            # Rutas de la API
│   │   └── migrations/        # Migraciones de base de datos
│   ├── config/                # Settings, urls raíz, wsgi
│   ├── Dockerfile
│   ├── entrypoint.sh          # Aplica migraciones y arranca runserver
│   ├── requirements.txt
│   └── seed.py                # Datos de prueba (RappiCard 9982)
├── frontend/
│   ├── app/                   # Páginas (App Router de Next.js)
│   ├── hooks/                 # useAuth, etc.
│   ├── lib/api.ts             # Funciones fetch hacia el backend
│   ├── types/finance.ts       # Interfaces TypeScript
│   ├── Dockerfile
│   └── next.config.ts
├── docker-compose.yml
├── .env                       # Variables activas (no está en git)
└── .env.example               # Plantilla de variables
```

---

## Contenedores Docker

| Contenedor            | Imagen                    | Puerto           | Descripción              |
|-----------------------|---------------------------|------------------|--------------------------|
| `personal_backend_1`  | `personal_backend:latest` | `8000`           | API Django               |
| `personal_frontend_1` | `personal_frontend:latest`| `3000`           | App Next.js              |
| `personal_db_1`       | `postgres:16-alpine`      | `5432` (interno) | Base de datos PostgreSQL |

> Portainer disponible en **http://localhost:9000** para gestión visual de contenedores.

---

## Comandos de gestión

### Levantar todo el proyecto

```bash
cd /home/eespinoza/personal
docker-compose up -d
```

### Apagar todo

```bash
docker-compose down
```

### Ver estado de los contenedores

```bash
docker ps
```

### Ver logs en vivo

```bash
docker logs -f personal_backend_1
docker logs -f personal_frontend_1
```

### Reiniciar un contenedor caído

```bash
docker start personal_frontend_1
docker start personal_backend_1
```

---

## Flujo de trabajo: cómo aplicar cambios

### ⚠️ El código está embebido en la imagen

Los contenedores **no montan el código del host como volumen**. Los cambios en archivos locales NO se reflejan automáticamente. Hay que copiarlos manualmente con `docker cp`.

---

### Cambios en el backend (archivos `.py`)

Django corre con `runserver` que **sí recarga automáticamente** al detectar cambios en `.py`. Solo basta con copiar el archivo:

```bash
docker cp backend/api/views.py       personal_backend_1:/app/api/views.py
docker cp backend/api/serializers.py personal_backend_1:/app/api/serializers.py
docker cp backend/api/urls.py        personal_backend_1:/app/api/urls.py
```

Django recarga en ~1 segundo. No es necesario reiniciar el contenedor.

---

### Cambios en modelos (`models.py`) → requiere migración

```bash
# 1. Copiar el modelo actualizado
docker cp backend/api/models.py personal_backend_1:/app/api/models.py

# 2. Crear la migración dentro del contenedor
docker exec personal_backend_1 python manage.py makemigrations

# 3. Copiar la migración nueva al host (para tenerla en git)
docker cp personal_backend_1:/app/api/migrations/. backend/api/migrations/

# 4. Aplicar la migración
docker exec personal_backend_1 python manage.py migrate
```

---

### Cambios en el frontend (archivos `.tsx`, `.ts`)

Next.js también corre con `npm run dev` (HMR activo), pero solo detecta cambios dentro del contenedor:

```bash
docker cp "frontend/app/cards/[id]/page.tsx" \
  "personal_frontend_1:/app/app/cards/[id]/page.tsx"

docker cp frontend/types/finance.ts  personal_frontend_1:/app/types/finance.ts
docker cp frontend/lib/api.ts        personal_frontend_1:/app/lib/api.ts
```

Next.js recompila automáticamente tras el `cp`. Si no lo hace, reinicia:

```bash
docker restart personal_frontend_1
```

---

### Cambios en dependencias → reconstruir imagen

Si modificas `requirements.txt` (Python) o `package.json` (Node):

```bash
# Solo backend
docker-compose build backend && docker-compose up -d backend

# Solo frontend
docker-compose build frontend && docker-compose up -d frontend

# Todo desde cero
docker-compose down && docker-compose build && docker-compose up -d
```

---

## Referencia rápida

| Situación | Comando |
|-----------|---------|
| Cambié un `.py` | `docker cp backend/api/<archivo>.py personal_backend_1:/app/api/<archivo>.py` |
| Cambié `models.py` | cp + makemigrations + cp migrations + migrate |
| Cambié un `.tsx` o `.ts` | `docker cp frontend/<ruta> personal_frontend_1:/app/<ruta>` |
| Cambié `requirements.txt` | `docker-compose build backend && docker-compose up -d backend` |
| Cambié `package.json` | `docker-compose build frontend && docker-compose up -d frontend` |
| Levantar todo | `docker-compose up -d` |
| Ver logs en vivo | `docker logs -f personal_backend_1` |
| Shell Django | `docker exec -it personal_backend_1 python manage.py shell` |
| Resetear datos | `docker exec -i personal_backend_1 python manage.py shell < backend/seed.py` |

---

## Datos de prueba (seed)

El script `backend/seed.py` crea datos reales de la RappiCard Banorte ···9982 con 3 periodos:

| Periodo | Fechas | Estado | saldo_total | saldo_periodo |
|---------|--------|--------|-------------|---------------|
| P1 | 2026-01-16 → 2026-02-15 | pagado | $9,467.23 | $21,357.22 |
| P2 | 2026-02-16 → 2026-03-15 | cerrado | $11,409.75 | $17,639.86 |
| P3 | 2026-03-16 → 2026-04-15 | abierto | — | — |

```bash
docker exec -i personal_backend_1 python manage.py shell < backend/seed.py
```

---

## Accesos

| Recurso | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Admin Django | http://localhost:8000/admin |
| Portainer | http://localhost:9000 |

**Credenciales admin:** `admin` / `Admin1234!`

---

## Endpoints de la API

### Autenticación

| Método | URL | Auth | Descripción |
|--------|-----|------|-------------|
| POST | `/api/auth/register/` | ❌ | Registro de usuario |
| POST | `/api/auth/login/` | ❌ | Login → devuelve JWT |
| POST | `/api/auth/refresh/` | ❌ | Renueva access token |
| GET/PUT | `/api/profile/` | ✅ | Ver/editar perfil |

### Tarjetas de crédito

| Método | URL | Descripción |
|--------|-----|-------------|
| GET/POST | `/api/finance/cards/` | Listar / crear tarjetas |
| GET/PUT/DELETE | `/api/finance/cards/:id/` | Detalle / editar / eliminar |
| GET | `/api/finance/cards/:id/summary/` | Resumen: saldos, disponible, fechas del periodo abierto |
| GET/POST | `/api/finance/cards/:id/expenses/` | Gastos del periodo |
| PUT/DELETE | `/api/finance/cards/:id/expenses/:eid/` | Editar / eliminar gasto |

### Estados de cuenta (`CardStatement`)

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/finance/cards/:id/statements/` | Lista de todos los periodos |
| POST | `/api/finance/cards/:id/statements/close/` | Cerrar el periodo abierto |
| POST | `/api/finance/cards/:id/statements/:sid/pay/` | Registrar pago de un periodo cerrado |

---

## Modelo `CardStatement`

```
estado: abierto → cerrado → pagado
         ↑                     ↓
    (auto-crea)          (auto-crea siguiente periodo)
```

| Campo | Descripción |
|-------|-------------|
| `saldo_total` | Pago para no generar intereses |
| `saldo_periodo` | Deuda total incluyendo meses diferidos (MSI/MCI) |
| `mensualidades` | Suma de mensualidades activas en el periodo |
| `pago_minimo` | Pago mínimo requerido |
| `estado` | `abierto` / `cerrado` / `pagado` |

**Reglas de negocio:**
- Solo puede haber **un** statement `abierto` por tarjeta a la vez
- Solo puede haber **un** statement `cerrado` a la vez (debe pagarse antes de cerrar el siguiente)
- Al pagar con tipo `total`, los gastos normales del periodo se marcan como pagados y los MSI/MCI avanzan un mes

---

## Variables de entorno (`.env`)

```bash
# Django
SECRET_KEY=cambia-esto
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000

# PostgreSQL
POSTGRES_DB=appdb
POSTGRES_USER=appuser
POSTGRES_PASSWORD=cambia-esto

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
