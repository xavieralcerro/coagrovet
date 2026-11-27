from odoo import fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    # Datos de las cuentas del sistema de citas
    vet_identidad = fields.Char("N.º de identidad (personal)", copy=False)
    vet_creado_por = fields.Char(copy=False)
    vet_editado_por = fields.Char(copy=False)
    vet_editado_en = fields.Datetime(copy=False)
    vet_avisos_leidos = fields.Datetime(copy=False)
    # Bloqueo por intentos fallidos al confirmar la contraseña de administrador
    vet_intentos_fallidos = fields.Integer(copy=False)
    vet_bloqueado_hasta = fields.Datetime(copy=False)

    def _vet_rol(self):
        """'admin', 'employee' o False si la cuenta no usa el sistema."""
        self.ensure_one()
        if self.has_group("veterinaria.group_vet_admin"):
            return "admin"
        if self.has_group("veterinaria.group_vet_recepcion"):
            return "employee"
        return False
