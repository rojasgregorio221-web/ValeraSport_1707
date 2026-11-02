// GET /api/obtener-productos
// Catálogo en CSV desde D1, sin las columnas privadas (el filtro está en catalogoCSV).
import { catalogoCSV } from "../_utils/d1.js";

// Misma clave que usa d1.js en invalidarCatalogo(): no la cambies.
const CLAVE_CACHE = "https://www.valerasportvzla.com/__cache/productos-csv";

const cabeceras = (seg) => ({ "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, max-age=" + seg });

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(CLAVE_CACHE);

  try {
    const guardada = await cache.match(cacheKey);
    if (guardada) return new Response(await guardada.text(), { status: 200, headers: cabeceras(5) });

    const csv = await catalogoCSV(context.env);
    context.waitUntil(cache.put(cacheKey, new Response(csv, { headers: cabeceras(60) })));
    return new Response(csv, { status: 200, headers: cabeceras(5) });
  } catch (error) {
    return new Response("Error al obtener el catálogo: " + error.message, { status: 500 });
  }
}