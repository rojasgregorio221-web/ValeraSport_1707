// POST /api/marcar-pagado
// Crea una orden pendiente y reserva el stock. Requiere sesión de Firebase;
// el correo sale SIEMPRE del token verificado.
import { verificarTokenFirebase } from "../_utils/verificarFirebase.js";
import { crearOrden, jsonResponse } from "../_utils/d1.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;

  if (!FIREBASE_PROJECT_ID) {
    return jsonResponse({ ok: false, error: "Faltan variables de entorno en Cloudflare Pages" }, 500);
  }

  const encabezadoAuth = request.headers.get("Authorization") || "";
  const idToken = encabezadoAuth.startsWith("Bearer ") ? encabezadoAuth.slice(7) : null;

  let payload;
  try {
    payload = await verificarTokenFirebase(idToken, FIREBASE_PROJECT_ID);
  } catch (error) {
    return jsonResponse({ ok: false, error: "Debes iniciar sesión para confirmar tu pedido (" + error.message + ")" }, 401);
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

  const referenciaLimpia = String(datos.referencia || "").trim();
  const telefonoLimpio = String(datos.telefonoPago || "").trim();

  if (datos.metodoPago !== "Efectivo en tienda") {
    if (!/^\d{8}$/.test(referenciaLimpia)) {
      return jsonResponse({ ok: false, error: "La referencia debe tener exactamente 8 dígitos" }, 400);
    }
    if (!telefonoLimpio) {
      return jsonResponse({ ok: false, error: "Falta el teléfono desde el que se hizo el pago" }, 400);
    }
  }

  const recortar = (valor, max) => String(valor || "").slice(0, max);

  // El precio NO se manda: d1.js lo toma de la base de datos.
  const itemsLimpios = datos.items.slice(0, 30).map((it) => ({
    nombre: recortar(it.nombre, 200),
    cantidad: Math.max(1, Math.min(99, parseInt(it.cantidad, 10) || 1)),
    color: recortar(it.color, 100),
    talla: recortar(it.talla, 50),
  }));

  try {
    const resultado = await crearOrden(env, {
      items: itemsLimpios,
      metodoPago: recortar(datos.metodoPago, 50),
      referencia: recortar(referenciaLimpia, 8),
      telefonoPago: recortar(telefonoLimpio, 20),
      correoCliente: payload.email,
    });
    return jsonResponse(resultado, 200);
  } catch (e) {
    console.error("marcar-pagado:", e && e.message);
    const msg = String((e && e.message) || "");
    if (msg.indexOf("D1_") === 0 || msg.indexOf("SQLITE") !== -1) {
      return jsonResponse({ ok: false, error: "No se pudo registrar el pedido. Intenta de nuevo." }, 500);
    }
    return jsonResponse({ ok: false, error: msg || "No se pudo registrar el pedido." }, 400);
  }
}