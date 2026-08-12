// GET /api/mis-compras
// El cliente (logueado con Firebase Authentication / Google) pide su propio
// historial de compras. Verificamos su token nosotros mismos en el servidor
// -- NUNCA confiamos en un correo que venga suelto del cliente en la
// petición, porque eso permitiría a cualquiera pedir el historial de otra
// persona con solo saber su correo.

import { verificarTokenFirebase } from "../_utils/verificarFirebase.js";

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const SHEET_WRITE_URL = env.SHEET_WRITE_URL;
  const CLAVE_ADMIN = env.CLAVE_ADMIN;
  const FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN || !FIREBASE_PROJECT_ID) {
    return jsonResponse({ ok: false, error: "Faltan variables de entorno en Cloudflare Pages" }, 500);
  }

  const encabezadoAuth = request.headers.get("Authorization") || "";
  const idToken = encabezadoAuth.startsWith("Bearer ") ? encabezadoAuth.slice(7) : null;

  let payload;
  try {
    payload = await verificarTokenFirebase(idToken, FIREBASE_PROJECT_ID);
  } catch (error) {
    return jsonResponse(
      { ok: false, error: "Debes iniciar sesión para ver tu historial (" + error.message + ")" },
      401
    );
  }

  try {
    const url =
      SHEET_WRITE_URL +
      "?accion=historialCliente" +
      "&correo=" + encodeURIComponent(payload.email) +
      "&clave=" + encodeURIComponent(CLAVE_ADMIN);

    const respuesta = await fetch(url);
    const texto = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(texto);
    } catch (e) {
      resultado = { ok: false, error: "Respuesta inesperada: " + texto.slice(0, 200) };
    }

    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  } catch (error) {
    return jsonResponse({ ok: false, error: "No se pudo conectar: " + error.message }, 500);
  }
}