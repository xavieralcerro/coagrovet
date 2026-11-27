# Coagro Vet · Frontend de agendado de citas

Stack: React + Vite + Tailwind v4 + React Router.

## Iniciar
Primero levanta la API (Odoo). Luego:

    npm install
    npm run dev

La API se busca en `http://localhost:8069/api`. Para usar otra, copia `.env.example`
como `.env` y cambia `VITE_API_URL`.

## Marca
Colores en `src/index.css` (bloque @theme): navy #163359, naranja #EC7B2D, gris #F2F2F2.
Logo: reemplazar `public/logo.svg` por el logo oficial.

## Estructura
- `src/lib/nav.js`  menú y módulos
- `src/components/layout/`  sidebar, topbar y layout base
- `src/components/`  componentes reutilizables (Button, PageHeader)
- `src/pages/`  una pantalla por módulo
