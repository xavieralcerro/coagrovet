from odoo import fields, http
from odoo.http import request

from ..models.utils import a_hhmm, iso
from . import serializers
from .base import ApiError, endpoint

MAXIMO = 50


def _evento(aviso):
    cita = aviso.cita_id
    return {
        "id": str(aviso.id),
        "type": aviso.tipo,
        "by": serializers.persona(aviso),
        "source": aviso.origen,
        "appointmentId": str(cita.id),
        "patient": cita.paciente_id.name or "Mascota eliminada",
        "client": cita.propietario_id.name or "Cliente eliminado",
        "date": cita.fecha.isoformat(),
        "time": a_hhmm(cita._inicio_min()),
        "at": iso(aviso.fecha_hora),
    }


class AvisosController(http.Controller):

    @endpoint("/api/notifications", ["GET"])
    def notifications(self, after=None, **kw):
        """Avisos de otras personas, el más reciente primero.
        Con after=<id> devuelve solo los nuevos (para consultar cada pocos segundos)."""
        usuario = request.env.user
        dominio = [("usuario_id", "!=", usuario.id)]
        if after is not None:
            if not (after.isdecimal() and len(after) <= 9):
                raise ApiError("El parámetro after no es válido")
            dominio.append(("id", ">", int(after)))
        avisos = request.env["vet.aviso"].sudo().search(dominio, limit=MAXIMO)
        return {
            "items": [_evento(a) for a in avisos],
            "lastRead": iso(usuario.sudo().vet_avisos_leidos) or "",
        }

    @endpoint("/api/notifications/read", ["POST"])
    def read(self, **kw):
        ahora = fields.Datetime.now()
        request.env.user.sudo().vet_avisos_leidos = ahora
        return {"lastRead": iso(ahora)}
