// POST /api/admin-pedidos  (versión segura generada por aplicar-seguridad.js)
//
// Entrada del panel:  { password, tipo: "pedidos" | "aceptados" | "resumen" | ... }
//                o:   { password, accion: "aceptarOrden" | "rechazarOrden" | ... , ...datos }
// El panel manda ADMIN_PASSWORD; este archivo la valida y SIEMPRE manda la
// clave a Google Apps Script (antes aceptar/rechazar no la mandaban).

const URL_VARS = ["SHEET_WRITE_URL","SHEET_CSV_URL","APPS_SCRIPT_URL","GOOGLE_SCRIPT_URL","GOOGLE_SHEETS_URL","SHEETS_URL","SCRIPT_URL"];
const CLAVE_VARS = ["CLAVE_ADMIN","APPS_SCRIPT_CLAVE"];
const URL_FALLBACK = "";

const LECTURAS = ["pedidos", "aceptados", "rechazadas", "ventas", "fiados", "gastos", "resumen", "semanas", "resumenSemanal", "historialCliente"];
const ACCIONES = ["aceptarOrden", "rechazarOrden", "rechazar_todos", "ventaFisica", "ventaFisicaLote", "marcarFiadoPagado", "agregarGasto", "eliminarGasto", "vaciarVentas", "cerrarSemana"];

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function parsearRespuesta(respuesta) {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto);
  } catch (e) {
    return { ok: false, error: "Respuesta inesperada de Google Sheets: " + texto.slice(0, 200) };
  }
}

function primero(env, nombres) {
  for (let i = 0; i < nombres.length; i++) {
    if (env[nombres[i]]) return env[nombres[i]];
  }
  return "";
}

function iguales(a, b) {
  const largo = Math.max(a.length, b.length);
  let r = a.length ^ b.length;
  for (let i = 0; i < largo; i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Solicitud inválida" }, 400);
  }

  const adminPassword = (env.ADMIN_PASSWORD || "").toString();
  const recibida = (datos.password || "").toString();
  if (!adminPassword || !iguales(recibida, adminPassword)) {
    return jsonResponse({ ok: false, error: "Clave incorrecta" }, 401);
  }

  const urlScript = primero(env, URL_VARS) || URL_FALLBACK;
  if (!urlScript) {
    return jsonResponse({ ok: false, error: "Falta configurar la URL del Apps Script en Cloudflare" }, 500);
  }
  const claveScript = primero(env, CLAVE_VARS) || adminPassword;

  let accion = (datos.accion || "").toString();
  if (!accion && datos.tipo) accion = datos.tipo.toString();
  if (LECTURAS.indexOf(accion) === -1 && ACCIONES.indexOf(accion) === -1) {
    return jsonResponse({ ok: false, error: "Acción no permitida: " + accion }, 400);
  }

  const cuerpo = Object.assign({}, datos);
  delete cuerpo.password;
  delete cuerpo.tipo;
  cuerpo.accion = accion;
  cuerpo.clave = claveScript;

  try {
    const respuesta = await fetch(urlScript, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(cuerpo),
      redirect: "follow",
    });
    const resultado = await parsearRespuesta(respuesta);

    // Compatibilidad: si el panel esperaba los datos del resumen en la raíz.
    if (accion === "resumen" && resultado && resultado.resumen) {
      Object.assign(resultado, resultado.resumen);
    }
    // Siempre un mensaje de error legible para el panel.
    if (resultado && resultado.ok === false && !resultado.mensaje) {
      resultado.mensaje = resultado.error;
    }
    return jsonResponse(resultado, 200);
  } catch (e) {
    return jsonResponse({ ok: false, error: "No se pudo conectar con Google Sheets" }, 502);
  }
}
