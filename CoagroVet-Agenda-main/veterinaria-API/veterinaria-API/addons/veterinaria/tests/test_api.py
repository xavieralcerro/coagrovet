import json
from datetime import date, timedelta

from odoo.tests import HttpCase, tagged
from odoo.tools import mute_logger


@tagged("post_install", "-at_install", "veterinaria")
class TestApi(HttpCase):

    def setUp(self):
        super().setUp()
        self.env.ref("base.user_admin").write({"password": "clave-admin-1"})
        # Próximo lunes y siguiente, siempre en el futuro
        hoy = date.today()
        self.lunes = hoy + timedelta(days=7 - hoy.weekday() + 7)
        self.admin = self.entrar("admin", "clave-admin-1", "admin")

    # ------------------------------------------------------------ ayudas
    def api(self, metodo, ruta, token=None, datos=None, espera=200):
        cabeceras = {"Content-Type": "application/json"}
        if token:
            cabeceras["Authorization"] = f"Bearer {token}"
        r = self.opener.request(
            metodo, self.base_url() + ruta, headers=cabeceras,
            data=json.dumps(datos) if datos is not None else None, timeout=30,
        )
        self.assertEqual(r.status_code, espera, f"{metodo} {ruta}: {r.text[:400]}")
        return r.json()

    def entrar(self, usuario, password, rol):
        return self.api("POST", "/api/auth/login", datos={
            "username": usuario, "password": password})["token"]

    def empleado(self, usuario="maria", dni="0801-2000-00001"):
        creado = self.api("POST", "/api/admin/employees", self.admin, {
            "name": f"Empleado {usuario}", "username": usuario, "dni": dni,
            "phone": "9999-0000", "email": "", "password": "secreto1"}, espera=201)
        return creado, self.entrar(usuario, "secreto1", "employee")

    def datos_cita(self, hora="08:00", dni="0301-2001-00099", **extra):
        datos = {
            "date": self.lunes.isoformat(), "time": hora, "duration": 150,
            "services": [{"id": "bano", "name": "x"}, {"id": "unas", "name": "y"}],
            "notes": " corte corto ", "ownerId": None, "petId": None,
            "owner": {"name": "José Núñez", "dni": dni, "phone": "9876-5432",
                      "email": "", "address": ""},
            "pet": {"name": "Firulais", "species": "Perro", "breed": "Poodle", "sex": "",
                    "ageValue": 3, "ageUnit": "years", "ageInMonths": 36,
                    "temperament": "Nervioso", "vaccinated": True, "health": ""},
        }
        datos.update(extra)
        return datos

    # ------------------------------------------------------------ sesión
    def test_sesion(self):
        self.api("GET", "/api/me", espera=401)
        self.api("GET", "/api/me", "token-falso", espera=401)
        self.api("POST", "/api/auth/login", datos={
            "username": "admin", "password": "mala"}, espera=401)
        yo = self.api("GET", "/api/me", self.admin)
        self.assertEqual(yo["role"], "admin")
        self.assertNotIn("password", yo)
        self.assertTrue(yo["sessionSince"])
        self.api("POST", "/api/auth/logout", self.admin)
        self.api("GET", "/api/me", self.admin, espera=401)

    def test_cors(self):
        for ruta, verbo in [("/api/services/bano", "DELETE"), ("/api/appointments/1", "PATCH"),
                            ("/api/admin/employees/1", "PUT"), ("/api/appointments", "POST")]:
            r = self.opener.options(self.base_url() + ruta, timeout=30)
            self.assertEqual(r.status_code, 204, ruta)
            self.assertIn(verbo, r.headers["Access-Control-Allow-Methods"])
            self.assertIn("Authorization", r.headers["Access-Control-Allow-Headers"])

    # ------------------------------------------------------------ empleados
    def test_empleados_y_permisos(self):
        creado, token = self.empleado()
        self.assertNotIn("password", creado)
        self.assertEqual(creado["role"], "employee")
        for ruta in ("/api/admin/employees", "/api/admin/logins?from=2026-01-01&to=2026-01-02",
                     "/api/admin/reports?from=2026-01-01&to=2026-01-02",
                     "/api/services?includeInactive=1", "/api/owners/1/deletion-impact"):
            self.api("GET", ruta, token, espera=403)
        self.api("POST", "/api/services", token, {"name": "Z"}, espera=403)
        self.api("DELETE", "/api/services/bano", token, espera=403)
        repetido = {"name": "Otro", "username": "MARIA", "dni": "1", "phone": "99990000",
                    "password": "secreto1"}
        self.api("POST", "/api/admin/employees", self.admin, repetido, espera=409)
        repetido.update(username="otro", dni="0801 2000 00001")
        self.api("POST", "/api/admin/employees", self.admin, repetido, espera=409)
        repetido.update(dni="2", password="123")
        self.api("POST", "/api/admin/employees", self.admin, repetido, espera=400)
        lista = self.api("GET", "/api/admin/employees", self.admin)
        self.assertEqual([e["username"] for e in lista], ["maria"])
        self.assertTrue(lista[0]["lastLogin"])
        # El administrador no se puede editar ni quitar por aquí
        admin_id = self.env.ref("base.user_admin").id
        self.api("DELETE", f"/api/admin/employees/{admin_id}", self.admin, espera=404)
        # Editar sin contraseña la conserva; con contraseña cierra sus sesiones
        ficha = {"name": "María", "username": "maria", "dni": "0801-2000-00001",
                 "phone": "99990000", "email": "m@x.hn", "password": ""}
        editado = self.api("PUT", f"/api/admin/employees/{creado['id']}", self.admin, ficha)
        self.assertEqual(editado["name"], "María")
        self.assertTrue(editado["updatedBy"])
        self.api("GET", "/api/me", token)
        ficha["password"] = "nueva-clave"
        self.api("PUT", f"/api/admin/employees/{creado['id']}", self.admin, ficha)
        self.api("GET", "/api/me", token, espera=401)
        token = self.entrar("maria", "nueva-clave", "employee")
        self.api("DELETE", f"/api/admin/employees/{creado['id']}", self.admin)
        self.api("GET", "/api/me", token, espera=401)
        self.api("POST", "/api/auth/login", datos={
            "username": "maria", "password": "nueva-clave"}, espera=401)
        self.empleado()  # el usuario y la identidad quedan libres

    def test_bloqueo_de_password(self):
        for _ in range(5):
            self.api("POST", "/api/admin/verify-password", self.admin, {"password": "no"}, espera=403)
        self.api("POST", "/api/admin/verify-password", self.admin,
                 {"password": "clave-admin-1"}, espera=429)

    # ------------------------------------------------------------ servicios
    def test_servicios(self):
        _, token = self.empleado()
        self.assertEqual(len(self.api("GET", "/api/services", token)), 9)
        nuevo = {"name": "Spa de patas", "description": "d", "icon": "paw"}
        creado = self.api("POST", "/api/services", self.admin, nuevo, espera=201)
        self.assertEqual(creado["id"], "spa-de-patas")
        self.api("POST", "/api/services", self.admin, {"name": "BANO"}, espera=400)
        editado = self.api("PUT", "/api/services/spa-de-patas", self.admin,
                           dict(nuevo, name="Spa"))
        self.assertEqual(editado["name"], "Spa")
        self.api("PATCH", "/api/services/spa-de-patas", self.admin, {"active": False})
        self.assertEqual(len(self.api("GET", "/api/services", token)), 9)
        self.assertEqual(len(self.api("GET", "/api/services?includeInactive=1", self.admin)), 10)
        self.api("DELETE", "/api/services/spa-de-patas", self.admin)
        activos = self.api("GET", "/api/services", self.admin)
        for s in activos[:-1]:
            self.api("PATCH", f"/api/services/{s['id']}", self.admin, {"active": False})
        ultimo = activos[-1]["id"]
        self.api("PATCH", f"/api/services/{ultimo}", self.admin, {"active": False}, espera=400)
        self.api("DELETE", f"/api/services/{ultimo}", self.admin, espera=400)

    # ------------------------------------------------------------ citas
    def test_flujo_de_citas(self):
        _, token = self.empleado()
        dia = self.lunes.isoformat()
        horas = self.api("GET", f"/api/availability?date={dia}&duration=150", token)
        self.assertEqual((horas[0]["time"], horas[-1]["time"]), ("08:00", "14:30"))
        domingo = (self.lunes - timedelta(days=1)).isoformat()
        self.assertEqual(self.api("GET", f"/api/availability?date={domingo}", token), [])

        cita = self.api("POST", "/api/appointments", token, self.datos_cita(), espera=201)
        self.assertEqual(cita["status"], "agendada")
        self.assertEqual(cita["patient"], "Firulais")
        self.assertEqual(cita["service"], "Baño, Corte de uñas y limado")
        self.assertEqual(cita["notes"], "corte corto")
        self.assertEqual(cita["history"][0]["by"]["name"], "Empleado maria")
        horas = {h["time"]: h["available"] for h in
                 self.api("GET", f"/api/availability?date={dia}", token)}
        self.assertFalse(horas["08:00"])
        self.assertFalse(horas["10:00"])
        self.assertTrue(horas["10:30"])

        self.api("POST", "/api/appointments", token,
                 self.datos_cita("10:00", dni="999"), espera=409)
        for malo in (
            {"date": domingo}, {"date": "2020-01-06"}, {"time": "15:00"}, {"time": "08:15"},
            {"time": "ayer"}, {"services": []}, {"services": [{"id": "no-existe"}]},
            {"owner": None}, {"pet": {"name": "", "species": "Perro"}},
            {"pet": {"name": "A", "species": "Dragón"}},
        ):
            datos = self.datos_cita("10:30", dni="555")
            datos.update(malo)
            self.api("POST", "/api/appointments", token, datos, espera=400)
        # Un fallo a medias no deja al dueño creado
        self.assertIsNone(self.api("GET", "/api/owners?dni=555", token))
        self.api("POST", "/api/appointments", token, self.datos_cita("10:30"), espera=409)

        # Cliente ya registrado con la misma mascota
        segunda = self.api("POST", "/api/appointments", token, self.datos_cita(
            "10:30", ownerId=cita["ownerId"], petId=cita["petId"], owner=None, pet=None),
            espera=201)
        self.assertEqual(segunda["petId"], cita["petId"])
        self.assertEqual(len(self.api("GET", f"/api/appointments?date={dia}", token)), 2)
        self.assertEqual(len(self.api(
            "GET", f"/api/appointments?month={dia[:7]}", token)), 2)

        for q in ("jose", "NUNEZ", "firu", "0301200100099", "9876", "EXP-"):
            encontrados = self.api("GET", f"/api/owners?search={q}", token)
            if q != "EXP-":
                self.assertEqual(len(encontrados), 1, q)
        dueno = self.api("GET", "/api/owners?dni=0301 2001 00099", token)
        mascota = dueno["pets"][0]
        self.assertTrue(mascota["recordNumber"].startswith("EXP-"))
        self.assertEqual((mascota["ageInMonths"], mascota["breed"]), (36, "Poodle"))
        self.assertEqual(len(self.api(
            "GET", f"/api/owners?search={mascota['recordNumber']}", token)), 1)

        hecho = self.api("PATCH", f"/api/appointments/{cita['id']}", token,
                         {"status": "completada"})
        self.assertEqual([h["action"] for h in hecho["history"]], ["agendada", "completada"])
        self.api("PATCH", f"/api/appointments/{cita['id']}", token,
                 {"status": "cancelada"}, espera=409)
        self.api("PATCH", f"/api/appointments/{segunda['id']}", token,
                 {"status": "agendada"}, espera=400)
        self.api("PATCH", "/api/appointments/999999", token,
                 {"status": "cancelada"}, espera=404)

        ficha = self.api("GET", f"/api/pets/{cita['petId']}/record", token)
        self.assertEqual(len(ficha["appointments"]), 2)
        self.assertEqual({s["name"]: s["count"] for s in ficha["services"]},
                         {"Baño": 1, "Corte de uñas y limado": 1})
        # Un servicio usado no se elimina y renombrarlo no cambia el historial
        self.api("DELETE", "/api/services/bano", self.admin, espera=400)
        self.api("PUT", "/api/services/bano", self.admin, {"name": "Baño express"})
        ficha = self.api("GET", f"/api/pets/{cita['petId']}/record", token)
        self.assertIn("Baño", [s["name"] for s in ficha["services"]])

        # Cancelar libera el horario
        self.api("PATCH", f"/api/appointments/{segunda['id']}", token, {"status": "cancelada"})
        self.api("POST", "/api/appointments", token, self.datos_cita(
            "10:30", ownerId=cita["ownerId"], petId=cita["petId"]), espera=201)

        # Avisos: solo lo que hicieron otros
        self.assertEqual(self.api("GET", "/api/notifications", token)["items"], [])
        avisos = self.api("GET", "/api/notifications", self.admin)
        self.assertEqual(len(avisos["items"]), 5)
        self.assertEqual(avisos["lastRead"], "")
        ultimo = avisos["items"][0]["id"]
        self.assertEqual(self.api(
            "GET", f"/api/notifications?after={ultimo}", self.admin)["items"], [])
        self.assertTrue(self.api("POST", "/api/notifications/read", self.admin)["lastRead"])

        informe = self.api(
            "GET", f"/api/admin/reports?from={dia}&to={dia}", self.admin)
        self.assertEqual(informe["totals"]["total"], 3)
        self.assertEqual(informe["totals"]["cancelRate"], 33)
        self.assertEqual(informe["staff"][0]["agendadas"], 3)
        hoy = date.today()
        informe = self.api("GET", "/api/admin/reports?from=%s&to=%s" % (
            hoy - timedelta(days=1), hoy + timedelta(days=1)), self.admin)
        self.assertEqual((informe["totals"]["newOwners"], informe["totals"]["newPets"]), (1, 1))
        accesos = self.api("GET", "/api/admin/logins?from=%s&to=%s" % (
            hoy - timedelta(days=1), hoy + timedelta(days=1)), self.admin)
        self.assertEqual(len(accesos), 2)

    # ------------------------------------------------------------ eliminar
    def _borrado(self, tipo):
        _, token = self.empleado()
        cita = self.api("POST", "/api/appointments", token, self.datos_cita(), espera=201)
        ident = cita["ownerId"] if tipo == "owners" else cita["petId"]
        ruta = f"/api/{tipo}/{ident}"
        impacto = self.api("GET", f"{ruta}/deletion-impact", self.admin)
        self.assertEqual(impacto, {"pets": 1, "appointments": 1, "scheduled": 1})
        clave = {"password": "clave-admin-1"}
        self.api("DELETE", ruta, token, clave, espera=403)
        self.api("DELETE", ruta, self.admin, {"password": "no"}, espera=403)
        self.api("DELETE", ruta, self.admin, clave, espera=409)
        self.api("PATCH", f"/api/appointments/{cita['id']}", token, {"status": "cancelada"})
        self.api("DELETE", ruta, self.admin, clave)
        quedan = self.api(
            "GET", f"/api/appointments?date={self.lunes.isoformat()}", token)[0]
        self.assertEqual(quedan["patient"], "Mascota eliminada")
        self.assertEqual(quedan["notes"], "")
        self.assertIsNone(quedan["petId"])
        aviso = self.api("GET", "/api/notifications", self.admin)["items"][0]
        self.assertEqual(aviso["patient"], "Mascota eliminada")
        return cita, quedan, token

    def test_eliminar_mascota(self):
        cita, quedan, token = self._borrado("pets")
        self.assertEqual(quedan["client"], "José Núñez")
        self.api("GET", f"/api/pets/{cita['petId']}/record", token, espera=404)

    def test_eliminar_dueno(self):
        cita, quedan, token = self._borrado("owners")
        self.assertEqual(quedan["client"], "Cliente eliminado")
        self.assertEqual(self.api("GET", "/api/owners", token), [])
        self.assertFalse(self.env["res.partner"].browse(int(cita["ownerId"])).exists())

    # ------------------------------------------------------------ base de datos
    @mute_logger("odoo.sql_db")
    def test_la_base_impide_traslapes(self):
        _, token = self.empleado()
        cita = self.api("POST", "/api/appointments", token, self.datos_cita(), espera=201)
        from psycopg2 import IntegrityError
        with self.assertRaises(IntegrityError), self.env.cr.savepoint():
            self.env["vet.cita"].create({
                "paciente_id": int(cita["petId"]), "fecha": self.lunes, "hora": 9.0,
                "linea_ids": [(0, 0, {"servicio_id": self.env.ref("veterinaria.servicio_bano").id})],
            })

    def test_uso_desde_odoo(self):
        """Un recepcionista puede trabajar desde las pantallas de Odoo."""
        creado, _ = self.empleado()
        env = self.env(user=int(creado["id"]))
        dueno = self.env["res.partner"].create({"name": "Ana"})
        paciente = env["vet.paciente"].create({
            "name": "Michi", "propietario_id": dueno.id,
            "especie_id": self.env.ref("veterinaria.especie_gato").id})
        self.assertTrue(dueno.vet_es_cliente)
        cita = env["vet.cita"].create({
            "paciente_id": paciente.id, "fecha": self.lunes, "hora": 8.0,
            "linea_ids": [(0, 0, {"servicio_id": self.env.ref("veterinaria.servicio_bano").id})]})
        cita.action_completar()
        self.assertEqual(len(cita.historial_ids), 2)
        self.assertEqual(cita.propietario_id, dueno)
        from odoo.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            cita.action_cancelar()
