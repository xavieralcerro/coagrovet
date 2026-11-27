from dateutil.relativedelta import relativedelta

from odoo import api, fields, models
from odoo.exceptions import ValidationError


class VetPaciente(models.Model):
    _name = "vet.paciente"
    _description = "Paciente (mascota)"
    _inherit = ["mail.thread"]
    _order = "name"
    _rec_names_search = ["name", "numero_expediente"]

    numero_expediente = fields.Char("N.º de expediente", readonly=True, copy=False, index=True)
    name = fields.Char("Nombre", required=True, tracking=True)
    # En Odoo los propietarios son contactos (res.partner)
    propietario_id = fields.Many2one(
        "res.partner", string="Propietario", required=True, tracking=True, ondelete="restrict"
    )
    especie_id = fields.Many2one("vet.especie", string="Especie", required=True)
    raza_id = fields.Many2one(
        "vet.raza", string="Raza", domain="[('especie_id', '=', especie_id)]"
    )
    sexo = fields.Selection([("macho", "Macho"), ("hembra", "Hembra")], string="Sexo")
    fecha_nacimiento = fields.Date("Fecha de nacimiento")
    # Si no se conoce la fecha de nacimiento se guarda la edad aproximada
    edad_valor = fields.Integer("Edad aproximada")
    edad_unidad = fields.Selection(
        [("months", "Meses"), ("years", "Años")], string="Unidad de edad", default="years"
    )
    edad_registrada_el = fields.Date("Edad registrada el", readonly=True)
    edad = fields.Char("Edad", compute="_compute_edad")
    peso = fields.Float("Peso (kg)", digits=(6, 2))
    temperamento = fields.Selection(
        [
            ("Tranquilo", "Tranquilo"),
            ("Nervioso", "Nervioso"),
            ("Reactivo o agresivo", "Reactivo o agresivo"),
        ],
        string="Comportamiento",
    )
    vacunado = fields.Boolean("Vacunas al día")
    salud = fields.Text("Alergias, piel o salud")
    descripcion = fields.Text("Descripción")
    notas = fields.Text("Notas")
    # 'active' permite archivar en vez de borrar (no se pierde el historial)
    active = fields.Boolean("Activo", default=True)
    cita_ids = fields.One2many("vet.cita", "paciente_id", string="Citas")

    _sql_constraints = [
        ("expediente_unico", "unique(numero_expediente)", "El número de expediente ya existe"),
    ]

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            vals["numero_expediente"] = (
                self.env["ir.sequence"].sudo().next_by_code("vet.paciente")
            )
            if vals.get("edad_valor"):
                vals["edad_registrada_el"] = fields.Date.context_today(self)
        records = super().create(vals_list)
        records.propietario_id.sudo().filtered(lambda p: not p.vet_es_cliente).write(
            {"vet_es_cliente": True}
        )
        return records

    def write(self, vals):
        if "edad_valor" in vals or "edad_unidad" in vals:
            vals = dict(vals, edad_registrada_el=fields.Date.context_today(self))
        return super().write(vals)

    def _edad_en_meses(self):
        """Edad actual en meses, o None si no se registró."""
        self.ensure_one()
        hoy = fields.Date.context_today(self)
        if self.fecha_nacimiento:
            delta = relativedelta(hoy, self.fecha_nacimiento)
            return delta.years * 12 + delta.months
        if not self.edad_valor:
            return None
        base = self.edad_valor * (12 if self.edad_unidad == "years" else 1)
        pasado = relativedelta(hoy, self.edad_registrada_el or hoy)
        return base + max(0, pasado.years * 12 + pasado.months)

    @api.depends("fecha_nacimiento", "edad_valor", "edad_unidad", "edad_registrada_el")
    def _compute_edad(self):
        for rec in self:
            meses = rec._edad_en_meses()
            if meses is None:
                rec.edad = False
                continue
            anios, resto = divmod(meses, 12)
            rec.edad = f"{anios} años, {resto} meses"

    @api.onchange("especie_id")
    def _onchange_especie_id(self):
        if self.raza_id and self.raza_id.especie_id != self.especie_id:
            self.raza_id = False

    @api.constrains("especie_id", "raza_id")
    def _check_raza(self):
        for rec in self:
            if rec.raza_id and rec.raza_id.especie_id != rec.especie_id:
                raise ValidationError("La raza no corresponde a la especie.")

    @api.constrains("fecha_nacimiento")
    def _check_fecha_nacimiento(self):
        hoy = fields.Date.context_today(self)
        for rec in self:
            if rec.fecha_nacimiento and rec.fecha_nacimiento > hoy:
                raise ValidationError("La fecha de nacimiento no puede ser futura.")

    @api.constrains("edad_valor", "edad_unidad")
    def _check_edad(self):
        for rec in self:
            maximo = 120 if rec.edad_unidad == "months" else 40
            if rec.edad_valor and not 1 <= rec.edad_valor <= maximo:
                raise ValidationError(f"La edad debe estar entre 1 y {maximo}")

    @api.constrains("peso")
    def _check_peso(self):
        for rec in self:
            if rec.peso < 0:
                raise ValidationError("El peso no puede ser negativo.")
