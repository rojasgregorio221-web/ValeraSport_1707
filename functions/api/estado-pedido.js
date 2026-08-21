// GET /api/estado-pedido?idOrden=...
// Público, sin contraseña: el cliente consulta el estado de su propia orden
// con el idOrden que le devolvió marcar-pagado.js al hacer el checkout.

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

  if (!SHEET_WRITE_URL || !CLAVE_ADMIN) {
    return jsonResponse({ ok: false, error: "Faltan variables de entorno en Cloudflare Pages" }, 500);
  }

  const url = new URL(request.url);
  const idOrden = url.searchParams.get("idOrden");
  if (!idOrden) {
    return jsonResponse({ ok: false, error: "Falta el id de la orden" }, 400);
  }

  try {
    const objetivo =
      SHEET_WRITE_URL +
      "?accion=estadoOrden&idOrden=" + encodeURIComponent(idOrden) +
      "&clave=" + encodeURIComponent(CLAVE_ADMIN);

    const respuesta = await fetch(objetivo);
    const texto = await respuesta.text();
    let resultado;
    try {
      resultado = JSON.parse(texto);
    } catch (e) {
      resultado = { ok: false, error: "Respuesta inesperada: " + texto.slice(0, 200) };
    }

    return jsonResponse(resultado, resultado.ok ? 200 : 500);
  } catch (error) {
    console.error("estado-pedido: fallo al conectar con Google Sheets", error);
    return jsonResponse({ ok: false, error: "No se pudo conectar con el servidor. Intenta de nuevo." }, 500);
  }
}