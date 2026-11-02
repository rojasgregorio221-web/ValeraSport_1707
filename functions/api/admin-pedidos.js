// POST /api/admin-pedidos
// Entrada: { password, tipo: "pedidos" | ... }  o  { password, accion: "aceptarOrden" | ..., ...datos }
import { despacharAdmin, validarAdmin, jsonResponse, ErrorHttp } from "../_utils/d1.js";

const LECTURAS = ["pedidos", "aceptados", "rechazadas", "ventas", "fiados", "gastos", "resumen", "semanas", "resumenSemanal", "historialCliente", "cashea_planes"];
const ACCIONES = ["aceptarOrden", "rechazarOrden", "rechazar_todos", "ventaFisica", "ventaFisicaLote", "marcarFiadoPagado", "agregarGasto", "eliminarGasto", "vaciarVentas", "cerrarSemana", "cashea_cobro", "cashea_crear_plan", "cashea_anular"];

export async function onRequestPost(context) {
  const { request, env } = context;

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Solicitud inválida" }, 400);
  }

  try {
    await validarAdmin(env, request, datos.password);

    const accion = String(datos.accion || datos.tipo || "");
    if (LECTURAS.indexOf(accion) === -1 && ACCIONES.indexOf(accion) === -1) {
      return jsonResponse({ ok: false, error: "Acción no permitida: " + accion }, 400);
    }

    const cuerpo = Object.assign({}, datos);
    delete cuerpo.password;
    delete cuerpo.tipo;
    cuerpo.accion = accion;

    return jsonResponse(await despacharAdmin(env, accion, cuerpo), 200);
  } catch (e) {
    if (e instanceof ErrorHttp) {
      return jsonResponse({ ok: false, error: e.message, mensaje: e.message }, e.status);
    }
    console.error("admin-pedidos:", e && e.message);
    const msg = e && e.message ? e.message : "Error inesperado";
    return jsonResponse({ ok: false, error: msg, mensaje: msg }, 200);
  }
}