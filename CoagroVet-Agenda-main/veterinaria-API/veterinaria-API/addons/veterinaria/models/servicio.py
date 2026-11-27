import re
import secrets

from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError

from .utils import normalizar


class VetServicio(models.Model):
    _name = "vet.servicio"
    _description = "Servicio"
    _order = "id"

    codigo = fields.Char("Código", readonly=True, copy=False, index=True)
    name = fields.Char("Nombre", required=True)
    descripcion = fields.Text("Descripción")
    icono = fields.Char("Icono", default="paw")
    active = fields.Boolean("Activo", default=True)

    _sql_constraints = [
        ("codigo_unico", "unique(codigo)", "El código del servicio ya existe"),
    ]

    @api.model_create_multi
    def create(self, vals_list):
        usados = set()
        for vals in vals_list:
            if not vals.get("codigo"):
                base = re.sub(r"[^a-z0-9]+", "-", normalizar(vals.get("name"))).strip("-") or "servicio"
                codigo = base
                while codigo in usados or self.with_context(active_test=False).search_count(
                    [("codigo", "=", codigo)]
                ):
                    codigo = f"{base}-{secrets.token_hex(2)}"
                vals["codigo"] = codigo
            usados.add(vals["codigo"])
        return super().create(vals_list)

    @api.constrains("name")
    def _check_nombre(self):
        todos = self.with_context(active_test=False).search([])
        for rec in self:
            if not normalizar(rec.name):
                raise ValidationError("Escribe el nombre del servicio")
            if any(o.id != rec.id and normalizar(o.name) == normalizar(rec.name) for o in todos):
                raise ValidationError("Ya existe un servicio con ese nombre")

    @api.constrains("active")
    def _check_queda_activo(self):
        if not self.search_count([("active", "=", True)]):
            raise ValidationError("Debe quedar al menos un servicio activo")

    def _usos(self):
        """Cantidad de citas que usaron cada servicio: {id: n}."""
        grupos = self.env["vet.cita.servicio"].sudo()._read_group(
            [("servicio_id", "in", self.ids)], ["servicio_id"], ["__count"]
        )
        return {servicio.id: total for servicio, total in grupos}

    @api.ondelete(at_uninstall=False)
    def _check_eliminar(self):
        usos = self._usos()
        for rec in self:
            n = usos.get(rec.id, 0)
            if n:
                palabra = "cita" if n == 1 else "citas"
                raise UserError(
                    f"Este servicio ya se usó en {n} {palabra}. Desactívalo en lugar de eliminarlo"
                )
        if not self.search_count([("active", "=", True), ("id", "not in", self.ids)]):
            raise UserError("Debe quedar al menos un servicio activo")
