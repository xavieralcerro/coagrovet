"""Utilidades comunes: JSON, sesión por token y manejo de errores."""
import functools
import json
import os
import re
from datetime import date

from psycopg2 import IntegrityError

from odoo import http
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.http import request

from ..models.cita import HORARIO_OCUPADO

# Origen permitido para el navegador. En producción: la URL del frontend.
CORS = os.environ.get("VET_CORS_ORIGIN", "*")

MENSAJES_BD = {
    "vet_cita_sin_traslape": (HORARIO_OCUPADO, 409),
    "res_partner_vet_identidad_unica": ("Ya existe un cliente con ese número de identidad", 409),
    "res_users_login_key": ("Ese nombre de usuario ya existe. Elige otro", 409),
}


class ApiError(Exception):
    def __init__(self, message, status=400, keep=False):
        super().__init__(message)
        self.message = message
        self.status = status
        self.keep = keep  # True: conservar lo escrito (contador de intentos)


def _json(data, status=200):
    return request.make_response(
        json.dumps(data, ensure_ascii=False),
        headers=[
            ("Content-Type", "application/json; charset=utf-8"),
            ("Cache-Control", "no-store"),
        ],
        status=status,
    )


def _rollback():
    request.env.cr.rollback()
    request.env.invalidate_all(flush=False)


def _autenticar():
    cabecera = request.httprequest.headers.get("Authorization", "")
    if cabecera.startswith("Bearer "):
        sesion = request.env["vet.sesion"].sudo()._vigente(cabecera[7:].strip())
        if sesion:
            return sesion
    raise ApiError("Tu sesión ya no es válida", 401)


def endpoint(ruta, metodos, acceso="usuario"):
    """acceso: 'publico', 'usuario' (con sesión) o 'admin'."""

    def decorador(func):
        @functools.wraps(func)
        def envoltura(self, **kwargs):
            try:
                if acceso != "publico":
                    sesion = _autenticar()
                    if acceso == "admin" and sesion.rol != "admin":
                        raise ApiError("Solo el administrador puede hacer esto", 403)
                    request.update_env(user=sesion.usuario_id.id)
                    request.vet_sesion = sesion
                resultado = func(self, **kwargs)
                request.env.flush_all()
                if isinstance(resultado, tuple):
                    return _json(*resultado)
                return _json(resultado)
            except ApiError as e:
                if not e.keep:
                    _rollback()
                return _json({"error": e.message}, e.status)
            except AccessError:
                _rollback()
                return _json({"error": "No tienes permiso para hacer esto"}, 403)
            except (ValidationError, UserError) as e:
                _rollback()
                return _json({"error": str(e.args[0]).rstrip(".")}, 400)
            except IntegrityError as e:
                nombre = e.diag.constraint_name
                _rollback()
                mensaje, estado = MENSAJES_BD.get(nombre, ("Los datos no son válidos", 409))
                return _json({"error": mensaje}, estado)

        return http.route(
            ruta,
            type="http",
            auth="public",
            methods=metodos,
            csrf=False,
            cors=CORS,
            save_session=False,
        )(envoltura)

    return decorador


# ------------------------------------------------------------ lectura de datos
def cuerpo():
    """JSON enviado por el cliente (siempre un objeto)."""
    try:
        datos = json.loads(request.httprequest.get_data(as_text=True) or "{}")
    except ValueError:
        raise ApiError("El cuerpo de la petición no es JSON válido")
    if not isinstance(datos, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON")
    return datos


def metodo():
    return request.httprequest.method


def texto(datos, clave, obligatorio=None, maximo=200):
    valor = datos.get(clave)
    if valor is None:
        valor = ""
    if not isinstance(valor, str):
        raise ApiError(f"El campo «{clave}» debe ser texto")
    valor = valor.strip()
    if obligatorio and not valor:
        raise ApiError(obligatorio)
    if len(valor) > maximo:
        raise ApiError(f"El campo «{clave}» es demasiado largo")
    return valor


def entero_id(valor, mensaje="No se encontró el registro"):
    """Convierte un id recibido como texto o número."""
    if isinstance(valor, (int, str)) and not isinstance(valor, bool):
        if re.fullmatch(r"[0-9]{1,9}", str(valor)):
            return int(valor)
    raise ApiError(mensaje, 404)


def leer_fecha(valor, mensaje="La fecha no es válida"):
    if isinstance(valor, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", valor):
        try:
            dia = date.fromisoformat(valor)
        except ValueError:
            raise ApiError(mensaje)
        if 2000 <= dia.year <= 2100:
            return dia
    raise ApiError(mensaje)


def validar_contacto(telefono, correo):
    if len(re.sub(r"\D", "", telefono)) < 8:
        raise ApiError("Escribe un teléfono de al menos 8 dígitos")
    if correo and not re.fullmatch(r"\S+@\S+\.\S+", correo):
        raise ApiError("Revisa el formato del correo")


def verificar_admin(password):
    """Confirma la contraseña del administrador conectado.
    Tras 5 fallos se bloquea 60 segundos."""
    from datetime import timedelta

    from odoo import fields
    from odoo.exceptions import AccessDenied

    usuario = request.env.user
    registro = usuario.sudo()
    ahora = fields.Datetime.now()
    if registro.vet_bloqueado_hasta and registro.vet_bloqueado_hasta > ahora:
        segundos = int((registro.vet_bloqueado_hasta - ahora).total_seconds()) + 1
        raise ApiError(f"Demasiados intentos. Espera {segundos} segundos", 429)
    try:
        if not isinstance(password, str) or not password:
            raise AccessDenied()
        usuario._check_credentials({"type": "password", "password": password}, {"interactive": True})
    except AccessDenied:
        intentos = registro.vet_intentos_fallidos + 1
        vals = {"vet_intentos_fallidos": intentos}
        if intentos >= 5:
            vals = {"vet_intentos_fallidos": 0, "vet_bloqueado_hasta": ahora + timedelta(seconds=60)}
        registro.write(vals)
        # 403 y no 401: la sesión sigue siendo válida
        raise ApiError("Contraseña incorrecta", 403, keep=True)
    if registro.vet_intentos_fallidos:
        registro.vet_intentos_fallidos = 0
