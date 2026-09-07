// GET /api/obtener-productos
// Descarga el CSV del catálogo desde Google Sheets y lo devuelve al navegador.
// El link del Sheet queda oculto como variable de entorno, nunca en el código fuente.
//
// IMPORTANTE SOBRE CACHÉ: el link "Publicar en la web" de Google Sheets tiene
// su propia caché interna (varios minutos) y, además, este endpoint antes
// agregaba OTROS 5 minutos de caché encima (Cache-Control: max-age=300). Con
// las dos cachés sumadas, un cambio de stock podía tardar bastante en verse
// reflejado en catalogo.html/admin.html. Para arreglarlo:
//   1. Le pedimos el CSV a Google con un parámetro "rompe-caché" (timestamp),
//      para que su CDN no nos devuelva una copia vieja guardada.
//   2. Bajamos el Cache-Control de nuestro lado a unos pocos segundos, solo
//      para amortiguar ráfagas de visitas simultáneas, no para esconder
//      cambios recientes.

export async function onRequestGet(context) {
  const SHEET_CSV_URL = context.env.SHEET_CSV_URL;

  if (!SHEET_CSV_URL) {
    return new Response(
      "Falta configurar la variable de entorno SHEET_CSV_URL en Cloudflare Pages (Settings > Environment variables).",
      { status: 500 }
    );
  }

  try {
    // Rompe-caché: le agregamos un parámetro único a la URL para que el CDN
    // de Google no nos sirva una respuesta vieja que tenga guardada.
    const separador = SHEET_CSV_URL.includes("?") ? "&" : "?";
    const urlSinCache = SHEET_CSV_URL + separador + "_t=" + Date.now();

    const respuesta = await fetch(urlSinCache, {
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!respuesta.ok) throw new Error("Google Sheets respondió con error " + respuesta.status);

    const textoCSV = await respuesta.text();

    return new Response(textoCSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Caché muy corta: solo amortigua ráfagas de requests casi simultáneas,
        // ya no esconde cambios de stock durante minutos.
        "Cache-Control": "public, max-age=5",
      },
    });
  } catch (error) {
    return new Response("Error al obtener el catálogo desde Google Sheets: " + error.message, {
      status: 500,
    });
  }
}