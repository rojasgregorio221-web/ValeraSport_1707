// GET /api/estado-pedido?idOrden=...   (acepta también ?codigo=... y &correo=...)
// Público: el código largo o corto de la orden. El número simple (ej. 28) exige el correo.
import { estadoOrden, jsonResponse } from "../_utils/d1.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const codigo = url.searchParams.get("idOrden") || url.searchParams.get("codigo");
  const correo = url.searchParams.get("correo") || "";

  if (!codigo) {
    return jsonResponse({ ok: false, error: "Falta el id de la orden" }, 400);
  }

  try {
    return jsonResponse(await estadoOrden(env, codigo, correo), 200);
  } catch (error) {
    console.error("estado-pedido:", error && error.message);
    return jsonResponse({ ok: false, error: "No se pudo consultar el pedido. Intenta de nuevo." }, 500);
  }
}