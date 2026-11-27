from odoo import fields, models


class VetEspecie(models.Model):
    _name = "vet.especie"
    _description = "Especie"
    _order = "name"

    name = fields.Char("Nombre", required=True)
    raza_ids = fields.One2many("vet.raza", "especie_id", string="Razas")

    _sql_constraints = [
        ("name_unique", "unique(name)", "La especie ya existe."),
    ]
