// POST /api/marcar-pagado
//
// El cliente hace checkout de su carrito (1 o varios productos) -> se crea
// una ORDEN PENDIENTE en el Sheet. El stock de cada producto se reserva
// (descuenta) al instante. El admin la aprueba o rechaza desde admin.html.
//
// Requiere sesión de Firebase (Authorization: Bearer <idToken>) -- el correo
// del cliente se toma SIEMPRE del token verificado, nunca de lo que mande el
// body, para que nadie pueda crear pedidos a nombre de otra persona ni
// golpear este endpoint público sin haber iniciado sesión.
//
// Body esperado:
// {
//   items: [{ nombre, precio, categoria, cantidad }, ...],
//   metodoPago, referencia,
//   comprobante  // opcional: imagen en base64 (data URL) del comprobante de pago
// }

import { verificarTokenFirebase } from "../_utils/verificarFirebase.js";

const MAX_COMPROBANTE_BASE64 = 2_000_000;

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const SHEET_WRITE_URL = env.SHEET_WRITE_URL;
  const FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;

  if (!SHEET_WRITE_URL || !FIREBASE_PROJECT_ID) {
    return jsonResponse(
      { ok: false, error: "Faltan variables de entorno en Cloudflare Pages" },
      500
    );
  }

  const encabezadoAuth = request.headers.get("Authorization") || "";
  const idToken = encabezadoAuth.startsWith("Bearer ") ? encabezadoAuth.slice(7) : null;

  let payload;
  try {
    payload = await verificarTokenFirebase(idToken, FIREBASE_PROJECT_ID);
  } catch (error) {
    return jsonResponse(
      { ok: false, error: "Debes iniciar sesión para confirmar tu pedido (" + error.message + ")" },
      401
    );
  }

  let datos;
  try {
    datos = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Cuerpo de la petición inválido" }, 400);
  }

  if (!Array.isArray(datos.items) || datos.items.length === 0) {
    return jsonResponse({ ok: false, error: "El carrito está vacío" }, 400);
  }
  if (!datos.metodoPago) {
    return jsonResponse({ ok: false, error: "Falta el método de pago" }, 400);
  }
  if (datos.metodoPago !== "Efectivo en tienda" && !datos.referencia) {
    return jsonResponse({ ok: false, error: "Falta el número de referencia del pago" }, 400);
  }
  if (
    datos.comprobante &&
    typeof datos.comprobante === "string" &&
    datos.comprobante.length > MAX_COMPROBANTE_BASE64
  ) {
    return jsonResponse(
      { ok: false, error: "La imagen del comprobante es demasiado grande. Intenta con otra foto." },
      400
    );
  }

  const recortar = (valor, max) => String(valor || "").slice(0, max);

  const itemsLimpios = datos.items.slice(0, 30).map((it) => ({
    nombre: recortar(it.nombre, 200),
    precio: recortar(it.precio, 20),
    categoria: recortar(it.categoria, 100),
    cantidad: Math.max(1, Math.min(99, parseInt(it.cantidad, 10) || 1)),
  }));

  const cuerpoParaSheet = {
    accion: "carrito",
    items: itemsLimpios,
    metodoPago: recortar(datos.metodoPago, 50),
    referencia: recortar(datos.referencia, 100),
    correoCliente: payload.email,
  };
  if (datos.comprobante && typeof datos.comprobante === "string") {
    cuerpoParaSheet.comprobante = datos.comprobante;
  }

  try {
    const respuesta = await fetch(SHEET_WRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpoParaSheet),
    });

    const texto = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(texto);
    } catch (e) {
      resultado = { ok: false, error: "Respuesta inesperada de Google Sheets: " + texto.slice(0, 200) };
    }

    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  } catch (error) {
    return jsonResponse({ ok: false, error: "No se pudo conectar con Google Sheets: " + error.message }, 500);
  }
}