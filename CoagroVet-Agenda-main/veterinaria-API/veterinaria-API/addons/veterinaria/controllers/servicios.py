from odoo import http
from odoo.http import request

from . import serializers
from .base import ApiError, cuerpo, endpoint, metodo, texto

ICONOS = {
    "droplets", "shield", "scissors", "paw", "ear", "sparkles",
    "wind", "brush", "palette", "heart", "star", "bone",
}


def _exigir_admin():
    if request.vet_sesion.rol != "admin":
        raise ApiError("Solo el administrador puede hacer esto", 403)


def _todos():
    # sudo: el administrador de la veterinaria gestiona el catálogo
    return request.env["vet.servicio"].sudo().with_context(active_test=False)


def _buscar(codigo):
    servicio = _todos().search([("codigo", "=", codigo)])
    if not servicio:
        raise ApiError("No se encontró el servicio", 404)
    return servicio


def _valores(datos):
    icono = texto(datos, "icon") or "paw"
    if icono not in ICONOS:
        raise ApiError("El icono no es válido")
    return {
        "name": texto(datos, "name", "Escribe el nombre del servicio", 100),
        "descripcion": texto(datos, "description", maximo=1000),
        "icono": icono,
    }


def _uno(servicio):
    return serializers.servicio(servicio, servicio._usos().get(servicio.id, 0))


class ServiciosController(http.Controller):

    @endpoint("/api/services", ["GET", "POST"])
    def services(self, includeInactive=None, **kw):
        if metodo() == "POST":
            _exigir_admin()
            return _uno(_todos().create(_valores(cuerpo()))), 201
        todos = includeInactive in ("1", "true")
        if todos:
            _exigir_admin()
        lista = _todos().search([] if todos else [("active", "=", True)])
        usos = lista._usos()
        return [serializers.servicio(s, usos.get(s.id, 0)) for s in lista]

    @endpoint("/api/services/<string:codigo>", ["PUT", "PATCH", "DELETE"], acceso="admin")
    def service(self, codigo, **kw):
        servicio = _buscar(codigo)
        if metodo() == "DELETE":
            servicio.unlink()
            return {"ok": True}
        datos = cuerpo()
        if metodo() == "PATCH":
            if not isinstance(datos.get("active"), bool):
                raise ApiError("Indica active: true o false")
            servicio.write({"active": datos["active"]})
        else:
            servicio.write(_valores(datos))
        return _uno(servicio)
