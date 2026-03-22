# Django + Next.js — Proyecto Fullstack

Proyecto fullstack con:
- **Backend**: Django 6 + Django REST Framework + JWT
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Base de datos**: PostgreSQL (Docker) / SQLite (desarrollo local)

## Estructura del proyecto

```
personal/
├── backend/       # API con Django REST Framework
├── frontend/      # App con Next.js
├── docker-compose.yml
└── .env.example   # Variables para Docker
```

---

## 🐳 Levantar con Docker (recomendado)

```bash
# 1. Copia y configura las variables de entorno
cp .env.example .env

# 2. Levanta todo
docker compose up --build
```

- Backend: **http://localhost:8000**
- Frontend: **http://localhost:3000**
- Admin Django: **http://localhost:8000/admin**

---

## 💻 Desarrollo local (sin Docker)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> ⚠️ El backend debe estar corriendo antes de iniciar el frontend.

---

## 🔑 Endpoints principales

| Método | URL | Auth | Descripción |
|--------|-----|------|-------------|
| POST | `/api/auth/register/` | ❌ | Registro |
| POST | `/api/auth/login/` | ❌ | Login → devuelve JWT |
| POST | `/api/auth/refresh/` | ❌ | Renueva access token |
| GET/PUT | `/api/profile/` | ✅ | Ver/editar perfil |
| GET/POST | `/api/items/` | ✅ | Listar/crear items |
| GET/PUT/DELETE | `/api/items/:id/` | ✅ | Detalle/editar/eliminar item |
| GET | `/api/admin/items/` | 👑 admin | Todos los items |
| GET | `/api/admin/users/` | 👑 admin | Todos los usuarios |

## 👥 Roles

| Rol | Acceso |
|-----|--------|
| `viewer` | CRUD de sus propios items |
| `editor` | CRUD de sus propios items |
| `admin` | Todo lo anterior + panel `/admin/items` y `/admin/users` |


Proyecto fullstack básico con:
- **Backend**: Django 6 + Django REST Framework
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS

## Estructura del proyecto

```
personal/
├── backend/       # API con Django REST Framework
└── frontend/      # App con Next.js
```

---

## Backend (Django)

### Requisitos
- Python 3.12+

### Instalación y ejecución

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

El servidor corre en: **http://localhost:8000**

### Endpoints disponibles

| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/hello/` | Mensaje de bienvenida |
| GET | `/api/items/` | Lista de items de ejemplo |

---

## Frontend (Next.js)

### Requisitos
- Node.js 18+

### Instalación y ejecución

```bash
cd frontend
npm install
npm run dev
```

La app corre en: **http://localhost:3000**

> ⚠️ El backend debe estar corriendo antes de iniciar el frontend.

---

## Ejecutar ambos a la vez

Abre dos terminales:

**Terminal 1 — Backend:**
```bash
cd backend && source venv/bin/activate && python manage.py runserver
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Luego abre **http://localhost:3000** en tu navegador.
