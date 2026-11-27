from odoo import fields, models


class VetRaza(models.Model):
    _name = "vet.raza"
    _description = "Raza"
    _order = "name"

    name = fields.Char("Nombre", required=True)
    especie_id = fields.Many2one(
        "vet.especie", string="Especie", required=True, ondelete="restrict"
    )

    _sql_constraints = [
        ("name_especie_unique", "unique(name, especie_id)", "La raza ya existe para esa especie."),
    ]
