import psycopg2

from odoo import http
from odoo.http import request

from ..models.utils import normalizar, normalizar_identidad, solo_digitos
from . import serializers
from .base import ApiError, cuerpo, endpoint, metodo, verificar_admin


def _clientes():
    return request.env["res.partner"].search(
        ["|", ("vet_es_cliente", "=", True), ("vet_paciente_ids", "!=", False)]
    )


def _dueno(dueno_id):
    dueno = request.env["res.partner"].browse(dueno_id).exists()
    if not dueno or not (dueno.vet_es_cliente or dueno.sudo().vet_paciente_ids):
        raise ApiError("No se encontró al cliente", 404)
    return dueno


def _mascota(mascota_id):
    paciente = request.env["vet.paciente"].with_context(active_test=False).browse(mascota_id).exists()
    if not paciente:
        raise ApiError("No se encontró el expediente", 404)
    return paciente


def _citas(dominio):
    return request.env["vet.cita"].sudo().search(dominio, order="fecha desc, hora desc")


def _exigir_sin_pendientes(citas):
    if citas.filtered(lambda c: c.estado == "agendada"):
        raise ApiError("Tiene citas agendadas. Cancélalas antes de eliminar", 409)


class ClientesController(http.Controller):

    @endpoint("/api/owners", ["GET"])
    def owners(self, dni=None, search="", **kw):
        if dni is not None:
            norm = normalizar_identidad(dni)
            encontrado = _clientes().filtered(lambda d: norm and d.vet_identidad_norm == norm)[:1]
            return serializers.dueno(encontrado, True) if encontrado else None
        q = normalizar(search)
        q_digitos = solo_digitos(search)
        q_dni = normalizar_identidad(search)

        def coincide(d):
            return (
                q in normalizar(d.name)
                or any(
                    q in normalizar(p.name) or q == normalizar(p.numero_expediente)
                    for p in d.sudo().vet_paciente_ids
                )
                or (len(q_dni) >= 3 and q_dni in (d.vet_identidad_norm or ""))
                or (len(q_digitos) >= 3 and q_digitos in solo_digitos(d.phone))
            )

        lista = _clientes()
        if q:
            lista = lista.filtered(coincide)
        return [
            serializers.dueno(d, True)
            for d in lista.sorted(lambda d: normalizar(d.name))
        ]

    @endpoint("/api/pets/<int:mascota_id>/record", ["GET"])
    def record(self, mascota_id, **kw):
        paciente = _mascota(mascota_id)
        citas = _citas([("paciente_id", "=", paciente.id)])
        brindados = {}
        for c in citas.filtered(lambda c: c.estado == "completada"):
            for linea in c.linea_ids:
                dato = brindados.setdefault(
                    linea.nombre, {"name": linea.nombre, "count": 0, "last": c.fecha.isoformat()}
                )
                dato["count"] += 1
        return {
            "pet": serializers.mascota(paciente),
            "owner": serializers.dueno(paciente.propietario_id),
            "appointments": [serializers.cita(c) for c in citas],
            "services": list(brindados.values()),
        }

    # -------------------------------------------------- eliminar (administrador)
    @endpoint("/api/owners/<int:dueno_id>/deletion-impact", ["GET"], acceso="admin")
    def owner_impact(self, dueno_id, **kw):
        dueno = _dueno(dueno_id)
        citas = _citas([("propietario_id", "=", dueno.id)])
        return {
            "pets": len(dueno.sudo().with_context(active_test=False).vet_paciente_ids),
            "appointments": len(citas),
            "scheduled": len(citas.filtered(lambda c: c.estado == "agendada")),
        }

    @endpoint("/api/pets/<int:mascota_id>/deletion-impact", ["GET"], acceso="admin")
    def pet_impact(self, mascota_id, **kw):
        paciente = _mascota(mascota_id)
        citas = _citas([("paciente_id", "=", paciente.id)])
        return {
            "pets": 1,
            "appointments": len(citas),
            "scheduled": len(citas.filtered(lambda c: c.estado == "agendada")),
        }

    @endpoint("/api/owners/<int:dueno_id>", ["DELETE"], acceso="admin")
    def owner_delete(self, dueno_id, **kw):
        verificar_admin(cuerpo().get("password"))
        dueno = _dueno(dueno_id).sudo()
        mascotas = request.env["vet.paciente"].sudo().with_context(active_test=False).search(
            [("propietario_id", "=", dueno.id)]
        )
        citas = _citas(
            ["|", ("propietario_id", "=", dueno.id), ("paciente_id", "in", mascotas.ids)]
        )
        _exigir_sin_pendientes(citas)
        # El historial se conserva para los informes, sin datos personales
        citas.write({"paciente_id": False, "propietario_id": False, "notas": False})
        mascotas.unlink()
        if dueno.with_context(active_test=False).user_ids:
            # También es usuario del sistema: solo se quita como cliente
            dueno.write({"vet_es_cliente": False, "vet_identidad": False})
        else:
            try:
                with request.env.cr.savepoint():
                    dueno.unlink()
            except Exception as e:
                if isinstance(e, psycopg2.OperationalError):
                    raise
                # Otro módulo de Odoo lo usa (p. ej. facturas): se anonimiza
                dueno.write(
                    {
                        "name": "Cliente eliminado", "vet_es_cliente": False,
                        "vet_identidad": False, "phone": False, "mobile": False,
                        "email": False, "street": False, "active": False,
                    }
                )
        return {"ok": True}

    @endpoint("/api/pets/<int:mascota_id>", ["DELETE"], acceso="admin")
    def pet_delete(self, mascota_id, **kw):
        verificar_admin(cuerpo().get("password"))
        paciente = _mascota(mascota_id).sudo()
        citas = _citas([("paciente_id", "=", paciente.id)])
        _exigir_sin_pendientes(citas)
        citas.write({"paciente_id": False, "notas": False})
        paciente.unlink()
        return {"ok": True}
