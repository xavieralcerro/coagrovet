"""Convierte registros de Odoo a la forma JSON que espera el frontend."""
from ..models.utils import a_hhmm, iso


def persona(registro):
    return {"id": str(registro.usuario_id.id) if registro.usuario_id else None,
            "name": registro.nombre_usuario}


def cita(c):
    c = c.sudo()
    historial = [
        {"action": h.accion, "by": persona(h), "at": iso(h.fecha_hora)} for h in c.historial_ids
    ]
    servicios = [{"id": l.servicio_id.codigo, "name": l.nombre} for l in c.linea_ids]
    dueno, mascota = c.propietario_id, c.paciente_id
    return {
        "id": str(c.id),
        "date": c.fecha.isoformat(),
        "time": a_hhmm(c._inicio_min()),
        "duration": c.duracion,
        "status": c.estado,
        "ownerId": str(dueno.id) if dueno else None,
        "petId": str(mascota.id) if mascota else None,
        "services": servicios,
        "notes": c.notas or "",
        "createdAt": iso(c.create_date),
        "createdBy": historial[0]["by"] if historial else None,
        "history": historial,
        "client": dueno.name or "Cliente eliminado",
        "phone": dueno.phone or "",
        "patient": mascota.name or "Mascota eliminada",
        "species": mascota.especie_id.name or "",
        "service": ", ".join(s["name"] for s in servicios),
    }


def mascota(p):
    p = p.sudo()
    meses = p._edad_en_meses()
    # Con fecha de nacimiento la edad se calcula hoy; si no, se envía lo registrado
    if p.fecha_nacimiento:
        valor, unidad = (meses // 12, "years") if meses >= 12 else (meses, "months")
        from odoo import fields
        registrada = fields.Date.context_today(p)
    else:
        valor = p.edad_valor or None
        unidad = p.edad_unidad or "years"
        registrada = p.edad_registrada_el or p.create_date.date()
        meses = valor * (12 if unidad == "years" else 1) if valor else None
    return {
        "id": str(p.id),
        "ownerId": str(p.propietario_id.id),
        "recordNumber": p.numero_expediente or "",
        "name": p.name,
        "species": p.especie_id.name,
        "breed": p.raza_id.name or "",
        "sex": dict(p._fields["sexo"].selection).get(p.sexo, ""),
        "ageValue": valor,
        "ageUnit": unidad,
        "ageInMonths": meses,
        "ageRecordedAt": registrada.isoformat(),
        "temperament": p.temperamento or "",
        "vaccinated": p.vacunado,
        "health": p.salud or "",
        "description": p.descripcion or "",
        "createdAt": iso(p.create_date),
    }


def dueno(d, con_mascotas=False):
    d = d.sudo()
    datos = {
        "id": str(d.id),
        "name": d.name or "",
        "dni": d.vet_identidad or "",
        "phone": d.phone or "",
        "email": d.email or "",
        "address": d.street or "",
        "createdAt": iso(d.create_date),
    }
    if con_mascotas:
        datos["pets"] = [mascota(p) for p in d.vet_paciente_ids.sorted("id")]
    return datos


def servicio(s, usos=0):
    return {
        "id": s.codigo,
        "name": s.name,
        "description": s.descripcion or "",
        "icon": s.icono or "paw",
        "active": s.active,
        "uses": usos,
    }


def empleado(u, ultimo_acceso=None):
    u = u.sudo()
    return {
        "id": str(u.id),
        "name": u.name,
        "username": u.login,
        "role": u._vet_rol() or "employee",
        "dni": u.vet_identidad or "",
        "phone": u.phone or "",
        "email": u.email or "",
        "createdAt": iso(u.create_date),
        "createdBy": u.vet_creado_por or None,
        "updatedAt": iso(u.vet_editado_en),
        "updatedBy": u.vet_editado_por or None,
        "lastLogin": iso(ultimo_acceso),
    }
