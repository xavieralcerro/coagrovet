from odoo import fields, models

from .cita import ESTADOS


class VetAviso(models.Model):
    """Aviso para la campana. Los nombres de cliente y mascota se leen de la cita,
    así desaparecen solos si se elimina el expediente."""

    _name = "vet.aviso"
    _description = "Aviso"
    _order = "id desc"

    cita_id = fields.Many2one("vet.cita", required=True, ondelete="cascade", index=True)
    tipo = fields.Selection(ESTADOS, required=True)
    usuario_id = fields.Many2one("res.users", ondelete="set null", index=True)
    nombre_usuario = fields.Char(required=True)
    origen = fields.Selection(
        [("staff", "Personal"), ("client", "Cliente")], default="staff", required=True
    )
    fecha_hora = fields.Datetime(required=True, default=fields.Datetime.now)
