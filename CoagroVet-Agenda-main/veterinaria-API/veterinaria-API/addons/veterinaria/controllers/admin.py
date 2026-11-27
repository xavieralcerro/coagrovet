import re
from datetime import timedelta

from odoo import fields, http
from odoo.http import request

from ..models.utils import iso, normalizar, normalizar_identidad, rango_utc
from . import serializers
from .base import (
    ApiError, cuerpo, endpoint, entero_id, leer_fecha, metodo, texto, validar_contacto,
)

PASSWORD_MINIMA = 6  # la misma que pide el formulario del frontend
MAXIMO_DIAS = 1100


def _usuarios():
    return request.env["res.users"].sudo().with_context(active_test=False)


def _empleados():
    """Solo cuentas de empleado: nunca administradores."""
    grupo = request.env.ref("veterinaria.group_vet_recepcion")
    return _usuarios().search([("groups_id", "in", grupo.id), ("active", "=", True)]).filtered(
        lambda u: u._vet_rol() == "employee" and not u.has_group("base.group_erp_manager")
    )


def _empleado(empleado_id):
    empleado = _empleados().filtered(lambda u: u.id == empleado_id)
    if not empleado:
        raise ApiError("No se encontró la cuenta", 404)
    return empleado


def _ultimo_acceso(usuario):
    sesion = request.env["vet.sesion"].sudo().search(
        [("usuario_id", "=", usuario.id)], limit=1
    )
    return sesion.inicio


def _valores(datos, actual=None):
    nombre = texto(datos, "name", "Escribe el nombre completo")
    usuario = texto(datos, "username", maximo=60).lower()
    if not re.fullmatch(r"[a-z0-9._-]{3,}", usuario):
        raise ApiError("El usuario debe tener al menos 3 letras o números, sin espacios")
    dni = texto(datos, "dni", "El número de identidad es obligatorio", 40)
    telefono = texto(datos, "phone", maximo=40)
    correo = texto(datos, "email")
    validar_contacto(telefono, correo)
    actual_id = actual.id if actual else 0
    if _usuarios().search_count([("login", "=", usuario), ("id", "!=", actual_id)]):
        raise ApiError("Ese nombre de usuario ya existe. Elige otro", 409)
    norm = normalizar_identidad(dni)
    otros = _usuarios().search(
        [("vet_identidad", "!=", False), ("active", "=", True), ("id", "!=", actual_id)]
    )
    if any(normalizar_identidad(o.vet_identidad) == norm for o in otros):
        raise ApiError("Ya existe una cuenta con ese número de identidad", 409)
    vals = {
        "name": nombre, "login": usuario, "vet_identidad": dni,
        "phone": telefono, "email": correo or False,
    }
    password = datos.get("password")
    if password or not actual:
        if not isinstance(password, str) or not PASSWORD_MINIMA <= len(password) <= 128:
            raise ApiError(f"La contraseña debe tener al menos {PASSWORD_MINIMA} caracteres")
        vals["password"] = password
    return vals


def _rango(desde, hasta):
    inicio = leer_fecha(desde, "La fecha inicial no es válida")
    fin = leer_fecha(hasta, "La fecha final no es válida")
    if inicio > fin:
        raise ApiError("La fecha inicial es posterior a la final")
    if (fin - inicio).days > MAXIMO_DIAS:
        raise ApiError("El rango de fechas es demasiado grande")
    return inicio, fin


class AdminController(http.Controller):

    @endpoint("/api/admin/employees", ["GET", "POST"], acceso="admin")
    def employees(self, **kw):
        if metodo() == "POST":
            vals = _valores(cuerpo())
            grupos = [
                request.env.ref("base.group_user").id,
                request.env.ref("veterinaria.group_vet_recepcion").id,
            ]
            vals.update(groups_id=[(6, 0, grupos)], vet_creado_por=request.env.user.name)
            nuevo = _usuarios().with_context(no_reset_password=True).create(vals)
            return serializers.empleado(nuevo), 201
        return [
            serializers.empleado(u, _ultimo_acceso(u))
            for u in _empleados().sorted(lambda u: normalizar(u.name))
        ]

    @endpoint("/api/admin/employees/<int:empleado_id>", ["PUT", "DELETE"], acceso="admin")
    def employee(self, empleado_id, **kw):
        empleado = _empleado(empleado_id)
        sesiones = request.env["vet.sesion"].sudo().search(
            [("usuario_id", "=", empleado.id), ("fin", "=", False)]
        )
        if metodo() == "DELETE":
            # Se archiva (el historial conserva su nombre) y se libera el usuario
            sesiones.write({"fin": fields.Datetime.now()})
            empleado.write({"active": False, "login": f"{empleado.login}#quitado{empleado.id}"})
            return {"ok": True}
        vals = _valores(cuerpo(), empleado)
        vals.update(vet_editado_por=request.env.user.name, vet_editado_en=fields.Datetime.now())
        empleado.write(vals)
        if "password" in vals:
            sesiones.write({"fin": fields.Datetime.now()})
        return serializers.empleado(empleado, _ultimo_acceso(empleado))

    @endpoint("/api/admin/reports", ["GET"], acceso="admin")
    def reports(self, **kw):
        env = request.env
        desde, hasta = _rango(kw.get("from"), kw.get("to"))
        citas = env["vet.cita"].sudo().search(
            [("fecha", ">=", desde), ("fecha", "<=", hasta)], order="fecha desc, hora desc"
        )
        totales = {"agendada": 0, "completada": 0, "cancelada": 0}
        dias = {}
        dia = desde
        while dia <= hasta:
            dias[dia] = {"date": dia.isoformat(), "agendada": 0, "completada": 0, "cancelada": 0}
            dia += timedelta(days=1)
        servicios, personal = {}, {}
        campo = {"agendada": "agendadas", "completada": "completadas", "cancelada": "canceladas"}
        for c in citas:
            totales[c.estado] += 1
            dias[c.fecha][c.estado] += 1
            if c.estado != "cancelada":
                for linea in c.linea_ids:
                    servicios[linea.nombre] = servicios.get(linea.nombre, 0) + 1
            for h in c.historial_ids:
                clave = h.usuario_id.id or h.nombre_usuario
                dato = personal.setdefault(
                    clave,
                    {"name": h.nombre_usuario, "agendadas": 0, "completadas": 0, "canceladas": 0},
                )
                dato[campo[h.accion]] += 1

        inicio, fin = rango_utc(env, desde, hasta)
        creados = [("create_date", ">=", inicio), ("create_date", "<", fin)]
        total = len(citas)
        return {
            "totals": {
                "total": total,
                **totales,
                "cancelRate": int(totales["cancelada"] * 100 / total + 0.5) if total else 0,
                "newOwners": env["res.partner"].sudo().search_count(
                    creados + [("vet_es_cliente", "=", True)]
                ),
                "newPets": env["vet.paciente"].sudo().with_context(active_test=False).search_count(creados),
            },
            "services": sorted(
                [{"name": n, "count": t} for n, t in servicios.items()],
                key=lambda s: -s["count"],
            ),
            "days": list(dias.values()),
            "staff": sorted(personal.values(), key=lambda p: normalizar(p["name"])),
            "appointments": [serializers.cita(c) for c in citas],
        }

    @endpoint("/api/admin/logins", ["GET"], acceso="admin")
    def logins(self, **kw):
        desde, hasta = _rango(kw.get("from"), kw.get("to"))
        inicio, fin = rango_utc(request.env, desde, hasta)
        sesiones = request.env["vet.sesion"].sudo().search(
            [("inicio", ">=", inicio), ("inicio", "<", fin)]
        )
        return [
            {
                "id": str(s.id),
                "userId": str(s.usuario_id.id) if s.usuario_id else None,
                "name": s.nombre_usuario,
                "role": s.rol,
                "loginAt": iso(s.inicio),
                "logoutAt": iso(s.fin),
            }
            for s in sesiones
        ]
