"""Funciones compartidas y configuración de la clínica."""
import re
import unicodedata
from datetime import datetime, time, timedelta

import pytz

DEFAULTS = {
    "veterinaria.duracion_cita": 150,  # minutos
    "veterinaria.hora_apertura": 8 * 60,  # minutos desde medianoche
    "veterinaria.hora_cierre": 17 * 60,
}
PASO_HORARIO = 30


def normalizar(texto):
    """Minúsculas y sin tildes, para comparar nombres y buscar."""
    texto = unicodedata.normalize("NFD", texto or "")
    return "".join(c for c in texto if not unicodedata.combining(c)).lower().strip()


def normalizar_identidad(texto):
    return re.sub(r"[^0-9a-zA-Z]", "", texto or "").upper()


def solo_digitos(texto):
    return re.sub(r"\D", "", texto or "")


def config_int(env, clave):
    valor = env["ir.config_parameter"].sudo().get_param(clave)
    try:
        return int(valor)
    except (TypeError, ValueError):
        return DEFAULTS[clave]


def zona(env):
    nombre = env["ir.config_parameter"].sudo().get_param("veterinaria.zona_horaria")
    return pytz.timezone(nombre or "America/Tegucigalpa")


def ahora_local(env):
    """Fecha y hora actual de la clínica (sin tzinfo)."""
    return datetime.now(zona(env)).replace(tzinfo=None)


def inicio_local(fecha, minutos):
    return datetime.combine(fecha, time()) + timedelta(minutes=minutos)


def rango_utc(env, desde, hasta):
    """Límites UTC (sin tzinfo) que cubren los días locales [desde, hasta]."""
    tz = zona(env)

    def convertir(dia):
        return tz.localize(datetime.combine(dia, time())).astimezone(pytz.utc).replace(tzinfo=None)

    return convertir(desde), convertir(hasta + timedelta(days=1))


def a_hhmm(minutos):
    return "%02d:%02d" % divmod(minutos, 60)


def iso(valor):
    """Datetime de Odoo (UTC) en formato ISO con Z, o None."""
    return valor.strftime("%Y-%m-%dT%H:%M:%SZ") if valor else None
