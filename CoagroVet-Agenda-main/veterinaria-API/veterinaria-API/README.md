# API de Coagro Vet (Odoo 18 + PostgreSQL)

Módulo `veterinaria`: backend del frontend CoagroVet-Agenda.

## Levantarlo
Desde la carpeta donde está `docker-compose.yml`.

Primera vez:

    docker compose up -d db
    docker compose run --rm odoo odoo -d veterinaria -i veterinaria --stop-after-init --without-demo=all
    docker compose up -d

Si ya tenías la base `veterinaria` con el módulo instalado, actualízalo en lugar de instalar:

    docker compose run --rm odoo odoo -d veterinaria -u veterinaria --stop-after-init
    docker compose up -d

Odoo queda en http://localhost:8069 y la API en http://localhost:8069/api.

**Cambia enseguida la contraseña del usuario `admin`** (en una base nueva es `admin`):
entra a Odoo, menú de tu usuario > Mi perfil > Seguridad de la cuenta.
Ese usuario es el administrador del sistema de citas. Los empleados se crean desde la API.

## Probar

    curl -X POST http://localhost:8069/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"TU_CLAVE","role":"admin"}'

    curl http://localhost:8069/api/services -H "Authorization: Bearer EL_TOKEN"

En PowerShell usa `Invoke-RestMethod` o Postman.

Pruebas automáticas (en una base aparte):

    docker compose run --rm odoo odoo -d vet_test -i veterinaria --test-enable --test-tags veterinaria --stop-after-init --without-demo=all --db-filter='^vet_test$'

Al final debe decir `0 failed, 0 error(s)`.

## Estructura (en addons/veterinaria)
- `models/`       datos y reglas (valen para la API y para las pantallas de Odoo)
- `controllers/`  endpoints REST
- `data/`         especies, servicios iniciales, horario y numeración de expedientes
- `security/`     roles y permisos
- `tests/`        pruebas de la API

## Horario de la clínica
Ajustes > Técnico > Parámetros del sistema (`veterinaria.*`).
Las horas van en minutos desde medianoche (480 = 8:00). El frontend tiene la duración y el
horario escritos en `src/lib/services.js`; puede leerlos de `GET /api/settings`.

## Antes de publicar
- Servir la API por HTTPS (un frontend en Vercel no puede llamar a una API en HTTP).
- Definir `VET_CORS_ORIGIN` con la URL del frontend.
- Cambiar las contraseñas de PostgreSQL y la contraseña maestra de Odoo (`admin_passwd`),
  y cerrar el administrador de bases de datos (`list_db = False`).
- Detrás de un proxy, activar `--proxy-mode`; si no, el bloqueo de intentos de acceso
  ve a todos con la misma dirección.
- Configurar respaldos de la base de datos.

Contrato de la API: ver `API.md`.
