# Contrato de la API

Base: `http://localhost:8069/api`. Todo es JSON.
Salvo el login, cada petición lleva `Authorization: Bearer <token>` (dura 12 horas).
Los errores son `{"error": "mensaje"}` (sin punto final, como espera el frontend).

| Código | Significado |
|---|---|
| 200 / 201 | Correcto / creado |
| 400 | Datos inválidos |
| 401 | Sin sesión, vencida o login incorrecto |
| 403 | Solo administrador, o contraseña de confirmación incorrecta |
| 404 | No existe |
| 409 | Conflicto (horario ocupado, duplicado, citas pendientes) |
| 429 | Demasiados intentos al confirmar la contraseña |

"Admin" = solo administrador. Los `id` son texto; los de servicios son como `bano`.

## Equivalencia con el frontend

| Función | Petición |
|---|---|
| `login(username, password)` | `POST /auth/login` → `{token, user}` |
| `logout()` | `POST /auth/logout` |
| `getMyProfile()` | `GET /me` |
| `getAppointmentsByDate(date)` | `GET /appointments?date=AAAA-MM-DD` → lista |
| `getAppointmentsByMonth(month)` | `GET /appointments?month=AAAA-MM` → **lista** (agrupar en el frontend) |
| `createAppointment(payload)` | `POST /appointments` (mismo payload) → cita |
| `updateAppointmentStatus(id, status)` | `PATCH /appointments/:id` `{status}` → cita con `history` |
| `getAvailableSlots(date, duration)` | `GET /availability?date=&duration=` |
| `findOwnerByDni(dni)` | `GET /owners?dni=` → dueño con `pets`, o `null` |
| `searchOwners(query)` | `GET /owners?search=` |
| `getPetRecord(petId)` | `GET /pets/:id/record` |
| `getDeletionImpact(type, id)` (Admin) | `GET /owners/:id/deletion-impact` o `/pets/:id/deletion-impact` |
| `deleteOwner` / `deletePet` (Admin) | `DELETE /owners/:id` o `/pets/:id` `{password}` |
| `getServices({includeInactive})` | `GET /services` (`?includeInactive=1` Admin) |
| `createService(data)` (Admin) | `POST /services` `{name, description, icon}` |
| `updateService(id, data)` (Admin) | `PUT /services/:id` |
| `setServiceActive(id, active)` (Admin) | `PATCH /services/:id` `{active}` |
| `deleteService(id)` (Admin) | `DELETE /services/:id` |
| `getEmployees()` (Admin) | `GET /admin/employees` |
| `createEmployee(data)` (Admin) | `POST /admin/employees` |
| `updateEmployee(id, data)` (Admin) | `PUT /admin/employees/:id` (`password` vacío = no cambia) |
| `deleteEmployee(id)` (Admin) | `DELETE /admin/employees/:id` |
| `verifyAdminPassword(password)` (Admin) | `POST /admin/verify-password` `{password}` |
| `getReport(from, to)` (Admin) | `GET /admin/reports?from=&to=` |
| `getAccessLog(from, to)` (Admin) | `GET /admin/logins?from=&to=` |
| avisos | `GET /notifications`, `GET /notifications?after=<id>`, `POST /notifications/read` |
| (nuevo) | `GET /settings`: categoría, duración y horario |

Las mascotas traen además `recordNumber` (EXP-00001) y `description` (opcional al crear).

## Cambios necesarios en el frontend
1. Guardar el `token` del login y enviarlo en cada petición. Ante un 401, volver al login.
2. Quitar "Mostrar contraseña" (`revealEmployeePassword`): las contraseñas van cifradas y no
   se pueden leer. Para cambiarla se usa "Editar empleado".
3. Agrupar por día la respuesta del mes.
4. Avisos: consultar cada 15 s con `?after=<id más reciente>`. La respuesta es
   `{items, lastRead}`, con los avisos de otras personas (máximo 50, el más nuevo primero).
5. En `deleteOwner` / `deletePet` enviar la contraseña en el cuerpo del `DELETE`.

## Ejemplo: agendar con cliente nuevo

```json
{
  "date": "2026-12-01",
  "time": "08:00",
  "services": [{ "id": "bano" }, { "id": "unas" }],
  "notes": "",
  "ownerId": null,
  "owner": { "name": "Ana López", "dni": "0301-2000-00001", "phone": "9999-9999", "email": "", "address": "" },
  "petId": null,
  "pet": { "name": "Luna", "species": "Perro", "breed": "Poodle", "sex": "Hembra",
           "ageValue": 3, "ageUnit": "years", "temperament": "Tranquilo",
           "vaccinated": true, "health": "", "description": "" }
}
```
La duración, los nombres de los servicios y el usuario que agenda los pone el servidor.
