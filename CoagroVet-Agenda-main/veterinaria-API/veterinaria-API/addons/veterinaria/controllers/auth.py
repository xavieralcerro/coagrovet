from odoo import fields, http
from odoo.exceptions import AccessDenied
from odoo.http import request

from ..models.utils import iso
from . import serializers
from .base import ApiError, cuerpo, endpoint, metodo, texto, verificar_admin


class AuthController(http.Controller):

    @endpoint("/api/auth/login", ["POST"], acceso="publico")
    def login(self, **kw):
        datos = cuerpo()
        incorrecto = ApiError("Usuario o contraseña incorrectos", 401)
        usuario = texto(datos, "username").lower()
        password = datos.get("password")
        if not usuario or not isinstance(password, str) or not password:
            raise incorrecto
        try:
            info = request.env["res.users"].sudo().authenticate(
                request.db,
                {"type": "password", "login": usuario, "password": password},
                {"interactive": True},
            )
        except AccessDenied:
            raise incorrecto
        cuenta = request.env["res.users"].sudo().browse(info["uid"])
        if cuenta._mfa_url():
            raise ApiError("Esta cuenta usa verificación en dos pasos y no puede entrar por aquí", 403)
        rol = cuenta._vet_rol()
        # El rol sale de la cuenta (grupos de Odoo), no de lo que mande el frontend
        if not rol:
            raise incorrecto
        sesion, token = request.env["vet.sesion"]._abrir(cuenta, rol)
        return {
            "token": token,
            "user": {
                "id": str(cuenta.id),
                "name": cuenta.name,
                "role": rol,
                "loginId": str(sesion.id),
            },
        }

    @endpoint("/api/auth/logout", ["POST"])
    def logout(self, **kw):
        request.vet_sesion.sudo().write({"fin": fields.Datetime.now()})
        return {"ok": True}

    @endpoint("/api/me", ["GET"])
    def me(self, **kw):
        datos = serializers.empleado(request.env.user)
        del datos["lastLogin"]
        datos["sessionSince"] = iso(request.vet_sesion.inicio)
        return datos

    @endpoint("/api/admin/verify-password", ["POST"], acceso="admin")
    def verify_password(self, **kw):
        verificar_admin(cuerpo().get("password"))
        return {"ok": True}
