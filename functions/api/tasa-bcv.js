// GET /api/tasa-bcv
// Público, sin contraseña: cualquier visitante de la tienda lo consulta para
// mostrar el precio en bolívares junto al precio en dólares del catálogo.
//
// Se usa dolarapi.com (que publica la tasa oficial del Banco Central de
// Venezuela) en vez de conectarse directo a bcv.org.ve: el sitio del BCV
// tiene un certificado de seguridad roto/no verificable, así que ni este
// servidor ni la mayoría de navegadores pueden conectarse ahí de forma
// segura. dolarapi.com ya resuelve ese problema del lado de ellos y expone
// la misma tasa oficial en un formato simple.
//
// La respuesta se cachea unas horas (Cache API de Cloudflare) para no
// golpear el servicio externo en cada visita al catálogo.

function jsonResponse(obj, status, cacheSegundos) {
  const headers = { "Content-Type": "application/json" };
  if (cacheSegundos) headers["Cache-Control"] = "public, max-age=" + cacheSegundos;
  return new Response(JSON.stringify(obj), { status, headers });
}

const SEGUNDOS_CACHE = 6 * 60 * 60; // 6 horas

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request("https://valerasportvzla.com/__cache/tasa-bcv");

  const cacheada = await cache.match(cacheKey);
  if (cacheada) return cacheada;

  try {
    const respuesta = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!respuesta.ok) throw new Error("Servicio de tasa no disponible");

    const datos = await respuesta.json();
    const tasa = Number(datos.promedio);
    if (!tasa || tasa <= 0) throw new Error("Tasa inválida recibida");

    const resultado = jsonResponse(
      { ok: true, tasa, fuente: "BCV (vía dolarapi.com)", fecha: datos.fechaActualizacion || new Date().toISOString() },
      200,
      SEGUNDOS_CACHE
    );
    context.waitUntil(cache.put(cacheKey, resultado.clone()));
    return resultado;
  } catch (error) {
    return jsonResponse({ ok: false, error: "No se pudo obtener la tasa del día" }, 502, 60);
  }
}
