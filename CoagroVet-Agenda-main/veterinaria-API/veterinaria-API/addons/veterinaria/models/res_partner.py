from odoo import api, fields, models
from odoo.exceptions import ValidationError

from .utils import normalizar_identidad


class ResPartner(models.Model):
    """El dueño de la mascota es un contacto de Odoo con número de identidad."""

    _inherit = "res.partner"

    vet_es_cliente = fields.Boolean("Cliente de la veterinaria", index=True, copy=False)
    vet_identidad = fields.Char("N.º de identidad", copy=False)
    vet_identidad_norm = fields.Char(compute="_compute_vet_identidad_norm", store=True, copy=False)
    vet_paciente_ids = fields.One2many("vet.paciente", "propietario_id", string="Mascotas")

    _sql_constraints = [
        (
            "vet_identidad_unica",
            "unique(vet_identidad_norm)",
            "Ya existe un cliente con ese número de identidad",
        ),
    ]

    @api.depends("vet_identidad")
    def _compute_vet_identidad_norm(self):
        for rec in self:
            # False se guarda como NULL, así los contactos sin identidad no chocan
            rec.vet_identidad_norm = normalizar_identidad(rec.vet_identidad) or False

    @api.constrains("vet_identidad")
    def _check_vet_identidad(self):
        for rec in self:
            if rec.vet_identidad and not normalizar_identidad(rec.vet_identidad):
                raise ValidationError("El número de identidad no es válido")
