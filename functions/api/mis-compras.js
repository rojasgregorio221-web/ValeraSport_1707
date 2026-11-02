// GET /api/mis-compras
// Historial del cliente logueado; el correo sale del token verificado.
import { verificarTokenFirebase } from "../_utils/verificarFirebase.js";
import { historialCliente, jsonResponse } from "../_utils/d1.js";

export async function onRequestGet(context) {
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
    return jsonResponse({ ok: false, error: "Debes iniciar sesión para ver tu historial (" + error.message + ")" }, 401);
  }

  try {
    return jsonResponse({ ok: true, compras: await historialCliente(env, payload.email) }, 200);
  } catch (error) {
    console.error("mis-compras:", error && error.message);
    return jsonResponse({ ok: false, error: "No se pudo cargar tu historial. Intenta de nuevo." }, 500);
  }
}