import hashlib
import secrets
from datetime import timedelta

from odoo import api, fields, models

HORAS_SESION = 12


class VetSesion(models.Model):
    """Sesiones de la API. También son el registro de accesos del personal.
    Solo se guarda el hash del token, nunca el token."""

    _name = "vet.sesion"
    _description = "Sesión de la API"
    _order = "id desc"
    _rec_name = "nombre_usuario"

    usuario_id = fields.Many2one("res.users", ondelete="set null", index=True)
    nombre_usuario = fields.Char(required=True)
    rol = fields.Selection([("admin", "Administrador"), ("employee", "Empleado")], required=True)
    token_hash = fields.Char(required=True, index=True)
    inicio = fields.Datetime(required=True, default=fields.Datetime.now)
    fin = fields.Datetime()
    expira = fields.Datetime(required=True)

    @api.model
    def _hash(self, token):
        return hashlib.sha256(token.encode()).hexdigest()

    @api.model
    def _abrir(self, usuario, rol):
        token = secrets.token_urlsafe(32)
        sesion = self.sudo().create(
            {
                "usuario_id": usuario.id,
                "nombre_usuario": usuario.name,
                "rol": rol,
                "token_hash": self._hash(token),
                "expira": fields.Datetime.now() + timedelta(hours=HORAS_SESION),
            }
        )
        return sesion, token

    @api.model
    def _vigente(self, token):
        sesion = self.sudo().search(
            [
                ("token_hash", "=", self._hash(token)),
                ("fin", "=", False),
                ("expira", ">", fields.Datetime.now()),
            ],
            limit=1,
        )
        usuario = sesion.usuario_id
        # Deja de valer si la cuenta se quitó o cambió de rol
        if not sesion or not usuario.active or usuario._vet_rol() != sesion.rol:
            return self.browse()
        return sesion
