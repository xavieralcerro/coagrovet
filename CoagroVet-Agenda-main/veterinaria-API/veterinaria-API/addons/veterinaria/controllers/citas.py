from datetime import timedelta

from odoo import http
from odoo.http import request

from ..models.cita import HORARIO_OCUPADO
from ..models.utils import (
    PASO_HORARIO, a_hhmm, ahora_local, config_int, inicio_local, normalizar,
    normalizar_identidad,
)
from . import serializers
from .base import (
    ApiError, cuerpo, endpoint, entero_id, leer_fecha, metodo, texto, validar_contacto,
)

CATEGORIA = "COAGROPET-SPA"


def _citas_activas(env, dia):
    return env["vet.cita"].search([("fecha", "=", dia), ("estado", "!=", "cancelada")])


def _traslapa(citas, inicio, duracion):
    return any(
        inicio < c._inicio_min() + c.duracion and c._inicio_min() < inicio + duracion
        for c in citas
    )


def _crear_dueno(datos):
    if not isinstance(datos, dict):
        raise ApiError("Faltan los datos del dueño")
    nombre = texto(datos, "name", "Escribe el nombre del dueño")
    dni = texto(datos, "dni", "El número de identidad es obligatorio", 40)
    telefono = texto(datos, "phone", maximo=40)
    correo = texto(datos, "email")
    validar_contacto(telefono, correo)
    norm = normalizar_identidad(dni)
    if not norm:
        raise ApiError("El número de identidad no es válido")
    Partner = request.env["res.partner"].sudo().with_context(active_test=False)
    if Partner.search_count([("vet_identidad_norm", "=", norm)]):
        raise ApiError("Ya existe un cliente con ese número de identidad", 409)
    return Partner.create(
        {
            "name": nombre,
            "vet_identidad": dni,
            "vet_es_cliente": True,
            "phone": telefono,
            "email": correo or False,
            "street": texto(datos, "address", maximo=300) or False,
        }
    )


def _crear_mascota(datos, dueno):
    if not isinstance(datos, dict):
        raise ApiError("Faltan los datos de la mascota")
    env = request.env
    nombre = texto(datos, "name", "Escribe el nombre de la mascota")

    pedida = normalizar(texto(datos, "species", "Elige la especie"))
    especie = env["vet.especie"].search([]).filtered(lambda e: normalizar(e.name) == pedida)[:1]
    if not especie:
        raise ApiError("La especie no está registrada")

    raza = env["vet.raza"]
    nombre_raza = texto(datos, "breed", maximo=100)
    if nombre_raza:
        buscada = normalizar(nombre_raza)
        raza = especie.raza_ids.filtered(lambda r: normalizar(r.name) == buscada)[:1]
        if not raza:
            raza = env["vet.raza"].sudo().create({"name": nombre_raza, "especie_id": especie.id})

    sexo = texto(datos, "sex")
    if sexo not in ("", "Macho", "Hembra"):
        raise ApiError("El sexo no es válido")
    temperamento = texto(datos, "temperament")
    if temperamento not in ("", "Tranquilo", "Nervioso", "Reactivo o agresivo"):
        raise ApiError("El comportamiento no es válido")

    unidad = datos.get("ageUnit") or "years"
    if unidad not in ("months", "years"):
        raise ApiError("La unidad de edad no es válida")
    edad = datos.get("ageValue")
    if edad in (None, ""):
        edad = 0
    else:
        maximo = 120 if unidad == "months" else 40
        if isinstance(edad, str) and edad.isdecimal() and len(edad) <= 3:
            edad = int(edad)
        if type(edad) is not int or not 1 <= edad <= maximo:
            raise ApiError(f"La edad debe ser un número entero entre 1 y {maximo}")

    return env["vet.paciente"].create(
        {
            "name": nombre,
            "propietario_id": dueno.id,
            "especie_id": especie.id,
            "raza_id": raza.id,
            "sexo": sexo.lower() or False,
            "edad_valor": edad,
            "edad_unidad": unidad,
            "temperamento": temperamento or False,
            "vacunado": datos.get("vaccinated") is True,
            "salud": texto(datos, "health", maximo=2000) or False,
            "descripcion": texto(datos, "description", maximo=2000) or False,
        }
    )


class CitasController(http.Controller):

    @endpoint("/api/settings", ["GET"])
    def settings(self, **kw):
        env = request.env
        apertura = config_int(env, "veterinaria.hora_apertura")
        cierre = config_int(env, "veterinaria.hora_cierre")
        return {
            "category": CATEGORIA,
            "appointmentDuration": config_int(env, "veterinaria.duracion_cita"),
            "openTime": a_hhmm(apertura),
            "closeTime": a_hhmm(cierre),
            "closedWeekdays": [0],  # 0 = domingo, como en JavaScript
        }

    @endpoint("/api/appointments", ["GET", "POST"])
    def appointments(self, date=None, month=None, **kw):
        if metodo() == "POST":
            return self._crear(), 201
        Cita = request.env["vet.cita"]
        if date:
            citas = Cita.search([("fecha", "=", leer_fecha(date))], order="hora")
            return [serializers.cita(c) for c in citas]
        if month:
            primero = leer_fecha(f"{month}-01", "El mes no es válido")
            siguiente = (primero + timedelta(days=32)).replace(day=1)
            citas = Cita.search(
                [("fecha", ">=", primero), ("fecha", "<", siguiente)], order="fecha, hora"
            )
            return [serializers.cita(c) for c in citas]
        raise ApiError("Indica date=AAAA-MM-DD o month=AAAA-MM")

    def _crear(self):
        env = request.env
        datos = cuerpo()
        dia = leer_fecha(datos.get("date"))
        hora = datos.get("time")
        if not isinstance(hora, str) or len(hora) != 5 or hora[2] != ":" \
                or not (hora[:2] + hora[3:]).isdecimal() or int(hora[3:]) > 59:
            raise ApiError("La hora no es válida")
        inicio = int(hora[:2]) * 60 + int(hora[3:])
        # La duración la decide el servidor, no el navegador
        duracion = config_int(env, "veterinaria.duracion_cita")
        apertura = config_int(env, "veterinaria.hora_apertura")
        if (inicio - apertura) % PASO_HORARIO:
            raise ApiError("La hora no es un horario disponible")
        if inicio_local(dia, inicio) <= ahora_local(env):
            raise ApiError("Esa hora ya pasó. Elige un horario posterior")
        if _traslapa(_citas_activas(env, dia), inicio, duracion):
            raise ApiError(HORARIO_OCUPADO, 409)

        pedidos = datos.get("services")
        if not isinstance(pedidos, list) or not pedidos:
            raise ApiError("Elige al menos un servicio")
        codigos = []
        for item in pedidos:
            codigo = item.get("id") if isinstance(item, dict) else item
            if not isinstance(codigo, str):
                raise ApiError("La lista de servicios no es válida")
            if codigo not in codigos:
                codigos.append(codigo)
        servicios = env["vet.servicio"].search([("codigo", "in", codigos)])
        if len(servicios) != len(codigos):
            raise ApiError("Uno de los servicios ya no está disponible")

        # Dueño y mascota: todo ocurre en la misma transacción
        if datos.get("ownerId"):
            dueno = env["res.partner"].browse(
                entero_id(datos["ownerId"], "No se encontró al cliente")
            ).exists()
            if not dueno or not (dueno.vet_es_cliente or dueno.sudo().vet_paciente_ids):
                raise ApiError("No se encontró al cliente", 404)
        else:
            dueno = _crear_dueno(datos.get("owner"))

        if datos.get("petId"):
            paciente = env["vet.paciente"].search(
                [
                    ("id", "=", entero_id(datos["petId"], "No se encontró la mascota")),
                    ("propietario_id", "=", dueno.id),
                ]
            )
            if not paciente:
                raise ApiError("No se encontró la mascota", 404)
        else:
            paciente = _crear_mascota(datos.get("pet"), dueno)

        cita = env["vet.cita"].create(
            {
                "paciente_id": paciente.id,
                "fecha": dia.isoformat(),
                "hora": inicio / 60,
                "duracion": duracion,
                "notas": texto(datos, "notes", maximo=2000) or False,
                "linea_ids": [
                    (0, 0, {"servicio_id": s.id}) for s in servicios.sorted("id")
                ],
            }
        )
        return serializers.cita(cita)

    @endpoint("/api/appointments/<int:cita_id>", ["PATCH"])
    def appointment(self, cita_id, **kw):
        estado = cuerpo().get("status")
        if estado not in ("completada", "cancelada"):
            raise ApiError("El estado debe ser completada o cancelada")
        cita = request.env["vet.cita"].browse(cita_id).exists()
        if not cita:
            raise ApiError("No se encontró la cita", 404)
        if cita.estado != "agendada":
            raise ApiError("Solo se puede cambiar el estado de una cita agendada", 409)
        cita.write({"estado": estado})
        return serializers.cita(cita)

    @endpoint("/api/availability", ["GET"])
    def availability(self, date=None, duration=None, **kw):
        env = request.env
        dia = leer_fecha(date)
        duracion = config_int(env, "veterinaria.duracion_cita")
        if duration:
            if not (duration.isdecimal() and len(duration) <= 3 and 30 <= int(duration) <= 540):
                raise ApiError("La duración no es válida")
            duracion = int(duration)
        if dia.weekday() == 6:  # domingo cerrado
            return []
        apertura = config_int(env, "veterinaria.hora_apertura")
        cierre = config_int(env, "veterinaria.hora_cierre")
        ocupadas = _citas_activas(env, dia)
        ahora = ahora_local(env)
        return [
            {
                "time": a_hhmm(inicio),
                "available": not _traslapa(ocupadas, inicio, duracion)
                and inicio_local(dia, inicio) > ahora,
            }
            for inicio in range(apertura, cierre - duracion + 1, PASO_HORARIO)
        ]
