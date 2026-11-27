"""Pacientes creados con la versión anterior: asigna expediente y marca a sus dueños."""
from odoo import SUPERUSER_ID, api


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    pacientes = env["vet.paciente"].with_context(active_test=False).search([], order="id")
    for paciente in pacientes.filtered(lambda p: not p.numero_expediente):
        paciente.numero_expediente = env["ir.sequence"].next_by_code("vet.paciente")
    pacientes.propietario_id.write({"vet_es_cliente": True})
