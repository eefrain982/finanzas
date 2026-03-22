# Instrucciones para GitHub Copilot

## Stack del proyecto
- **Backend**: Django 6 + Django REST Framework + django-cors-headers
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + App Router

## Estructura
- `backend/` — API REST con Django
- `frontend/` — Interfaz con Next.js

## Convenciones
- El backend corre en `http://localhost:8000`
- El frontend corre en `http://localhost:3000`
- CORS habilitado para `localhost:3000`
- Usar `api_view` decorators en Django para endpoints simples
- Usar `"use client"` en Next.js para componentes con estado o efectos
