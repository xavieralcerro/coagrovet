from odoo import api, fields, models
from odoo.exceptions import ValidationError

from .utils import a_hhmm, ahora_local, config_int, inicio_local

ESTADOS = [
    ("agendada", "Agendada"),
    ("completada", "Completada"),
    ("cancelada", "Cancelada"),
]
HORARIO_OCUPADO = "Ese horario ya fue ocupado. Elige otra hora"


class VetCita(models.Model):
    _name = "vet.cita"
    _description = "Cita"
    _order = "fecha desc, hora desc"

    # paciente y propietario quedan vacíos solo cuando se elimina el expediente
    paciente_id = fields.Many2one("vet.paciente", string="Mascota", ondelete="set null", index=True)
    propietario_id = fields.Many2one("res.partner", string="Propietario", ondelete="set null", index=True)
    fecha = fields.Date("Fecha", required=True, index=True)
    hora = fields.Float("Hora de inicio", required=True)
    duracion = fields.Integer(
        "Duración (min)",
        required=True,
        default=lambda self: config_int(self.env, "veterinaria.duracion_cita"),
    )
    estado = fields.Selection(ESTADOS, string="Estado", required=True, default="agendada", index=True)
    notas = fields.Text("Indicaciones")
    linea_ids = fields.One2many("vet.cita.servicio", "cita_id", string="Servicios")
    historial_ids = fields.One2many("vet.cita.historial", "cita_id", string="Historial", readonly=True)

    # La base de datos impide dos citas activas traslapadas, incluso si llegan a la vez
    _sql_constraints = [
        (
            "sin_traslape",
            """EXCLUDE USING gist (
                int4range(
                    (fecha - DATE '2000-01-01') * 1440 + round(hora * 60)::int,
                    (fecha - DATE '2000-01-01') * 1440 + round(hora * 60)::int + duracion
                ) WITH &&
            ) WHERE (estado <> 'cancelada')""",
            HORARIO_OCUPADO,
        ),
    ]

    def _inicio_min(self):
        self.ensure_one()
        return int(round(self.hora * 60))

    @api.depends("paciente_id", "fecha", "hora")
    def _compute_display_name(self):
        for rec in self:
            nombre = rec.paciente_id.name or "Mascota eliminada"
            hora = a_hhmm(rec._inicio_min())
            rec.display_name = f"{nombre} · {rec.fecha or ''} {hora}"

    @api.onchange("paciente_id")
    def _onchange_paciente(self):
        self.propietario_id = self.paciente_id.propietario_id

    @api.constrains("fecha", "hora", "duracion")
    def _check_horario(self):
        apertura = config_int(self.env, "veterinaria.hora_apertura")
        cierre = config_int(self.env, "veterinaria.hora_cierre")
        for rec in self:
            inicio = rec._inicio_min()
            if rec.fecha.weekday() == 6:
                raise ValidationError("Los domingos la clínica está cerrada")
            if rec.duracion <= 0:
                raise ValidationError("La duración no es válida")
            if inicio < apertura or inicio + rec.duracion > cierre:
                raise ValidationError(
                    f"La cita debe estar entre las {a_hhmm(apertura)} y las {a_hhmm(cierre)}"
                )

    def _check_no_pasada(self):
        ahora = ahora_local(self.env)
        for rec in self:
            if inicio_local(rec.fecha, rec._inicio_min()) <= ahora:
                raise ValidationError("Esa hora ya pasó. Elige un horario posterior")

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("estado", "agendada") != "agendada":
                raise ValidationError("Una cita nueva siempre inicia como agendada")
            paciente = self.env["vet.paciente"].browse(vals.get("paciente_id"))
            if not paciente:
                raise ValidationError("Elige la mascota de la cita")
            vals["propietario_id"] = paciente.propietario_id.id
        citas = super().create(vals_list)
        citas._check_no_pasada()
        for cita in citas:
            if not cita.linea_ids:
                raise ValidationError("Elige al menos un servicio")
            cita._registrar("agendada")
        return citas

    def write(self, vals):
        nuevo = vals.get("estado")
        cambian = self.filtered(lambda c: c.estado != nuevo) if nuevo else self.browse()
        if cambian.filtered(lambda c: c.estado != "agendada"):
            raise ValidationError("Solo se puede cambiar el estado de una cita agendada")
        mueve = {"fecha", "hora", "duracion"} & set(vals)
        if mueve and self.filtered(lambda c: c.estado != "agendada"):
            raise ValidationError("No se puede reprogramar una cita cerrada")
        if "linea_ids" in vals and self.filtered(lambda c: c.estado != "agendada"):
            raise ValidationError("No se pueden cambiar los servicios de una cita cerrada")
        res = super().write(vals)
        if mueve:
            self._check_no_pasada()
        if "linea_ids" in vals and self.filtered(lambda c: not c.linea_ids):
            raise ValidationError("Elige al menos un servicio")
        for cita in cambian:
            cita._registrar(nuevo)
        return res

    def _registrar(self, accion):
        """Guarda quién hizo la acción y crea el aviso para los demás."""
        self.ensure_one()
        usuario = self.env.user
        self.env["vet.cita.historial"].sudo().create(
            {
                "cita_id": self.id,
                "accion": accion,
                "usuario_id": usuario.id,
                "nombre_usuario": usuario.name,
            }
        )
        self.env["vet.aviso"].sudo().create(
            {
                "cita_id": self.id,
                "tipo": accion,
                "usuario_id": usuario.id,
                "nombre_usuario": usuario.name,
            }
        )

    def action_completar(self):
        self.write({"estado": "completada"})

    def action_cancelar(self):
        self.write({"estado": "cancelada"})


class VetCitaServicio(models.Model):
    _name = "vet.cita.servicio"
    _description = "Servicio de una cita"
    _order = "id"
    _rec_name = "nombre"

    cita_id = fields.Many2one("vet.cita", required=True, ondelete="cascade", index=True)
    servicio_id = fields.Many2one(
        "vet.servicio", string="Servicio", required=True, ondelete="restrict", index=True
    )
    # Copia del nombre: renombrar un servicio no altera el historial
    nombre = fields.Char("Nombre registrado", readonly=True)

    _sql_constraints = [
        ("servicio_unico", "unique(cita_id, servicio_id)", "El servicio está repetido en la cita"),
    ]

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            cita = self.env["vet.cita"].browse(vals.get("cita_id"))
            if cita.estado != "agendada":
                raise ValidationError("No se pueden cambiar los servicios de una cita cerrada")
            vals["nombre"] = self.env["vet.servicio"].browse(vals["servicio_id"]).name
        return super().create(vals_list)

    def write(self, vals):
        if self.cita_id.filtered(lambda c: c.estado != "agendada"):
            raise ValidationError("No se pueden cambiar los servicios de una cita cerrada")
        if "servicio_id" in vals:
            vals = dict(vals, nombre=self.env["vet.servicio"].browse(vals["servicio_id"]).name)
        return super().write(vals)

    @api.ondelete(at_uninstall=False)
    def _check_eliminar(self):
        if self.cita_id.filtered(lambda c: c.estado != "agendada"):
            raise ValidationError("No se pueden cambiar los servicios de una cita cerrada")


class VetCitaHistorial(models.Model):
    _name = "vet.cita.historial"
    _description = "Historial de una cita"
    _order = "id"
    _rec_name = "accion"

    cita_id = fields.Many2one("vet.cita", required=True, ondelete="cascade", index=True)
    accion = fields.Selection(ESTADOS, string="Acción", required=True)
    usuario_id = fields.Many2one("res.users", string="Usuario", ondelete="set null")
    nombre_usuario = fields.Char("Hecho por", required=True)
    fecha_hora = fields.Datetime("Fecha y hora", required=True, default=fields.Datetime.now)
